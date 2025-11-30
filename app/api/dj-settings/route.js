export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

let supabaseAdmin = null;

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Extract DJ tag from message body
 * Handles formats like:
 * - "DJ Joey can you play..."
 * - "dj james play..."
 * - "Hey DJ Joey, play..."
 * - "DJ Joey Blinding Lights"
 * - "DJ Joey"
 */
function extractDJTag(message) {
  if (!message || typeof message !== 'string') return null;
  
  // Clean the message
  const cleanMessage = message.trim();
  
  // Words that indicate the DJ name has ended and a request/action is starting
  const stopWords = [
    'can', 'could', 'would', 'will', 'please', 'play', 'put', 'drop',
    'spin', 'throw', 'queue', 'add', 'request', 'i', 'we', 'do', 'you',
    'want', 'need', 'like', 'love', 'got', 'have', 'get', 'give', 'song',
    'track', 'music', 'some', 'any', 'the', 'a', 'an', 'this', 'that'
  ];
  
  // First, find "DJ" followed by words
  const djMatch = cleanMessage.match(/\b(dj\s+\S+(?:\s+\S+)*)/i);
  
  if (!djMatch) return null;
  
  // Split the matched portion into words
  const words = djMatch[1].split(/\s+/);
  
  // Build the DJ tag by taking words until we hit a stop word
  const tagWords = [words[0]]; // Always include "DJ"
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, '');
    
    // Stop if we hit a stop word
    if (stopWords.includes(word)) {
      break;
    }
    
    // Stop if it looks like a song title (contains numbers or special patterns)
    // But allow simple names like "Joey2" or "DJ Mike"
    if (i > 2) {
      break; // DJ names are typically 1-2 words after "DJ"
    }
    
    tagWords.push(words[i]);
  }
  
  // Must have at least "DJ [Name]"
  if (tagWords.length < 2) return null;
  
  // Clean and return
  const tag = tagWords.join(' ').replace(/[,.:!?]+$/, '').trim();
  
  console.log("Extracted DJ tag:", tag, "from message:", cleanMessage);
  
  return tag;
}

/**
 * Find DJ by tag (case-insensitive)
 */
async function findDJByTag(tag) {
  if (!tag) return null;
  
  const { data, error } = await supabaseAdmin
    .from("dj_profiles")
    .select("id, preferred_platform, twilio_number, tag, plan, name")
    .ilike("tag", tag)
    .maybeSingle();
  
  if (error) {
    console.error("Error finding DJ by tag:", error);
    return null;
  }
  
  return data;
}

/**
 * Find DJ by phone number (tries multiple formats)
 */
async function findDJByPhone(phone) {
  if (!phone) return null;
  
  // Try multiple phone formats
  const phoneVariants = [
    phone,
    phone.replace(/\D/g, ''),
    '+' + phone.replace(/\D/g, ''),
    '+1' + phone.replace(/\D/g, '').slice(-10),
    phone.replace(/\D/g, '').slice(-10),
  ];

  for (const variant of phoneVariants) {
    if (!variant) continue;
    
    const { data, error } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, preferred_platform, twilio_number, tag, plan, name")
      .eq("twilio_number", variant)
      .maybeSingle();

    if (data) {
      return data;
    }
  }
  
  return null;
}

/**
 * Find all DJs with the same twilio_number (for shared universal number)
 */
async function findAllDJsOnNumber(phone) {
  if (!phone) return [];
  
  const phoneVariants = [
    phone,
    phone.replace(/\D/g, ''),
    '+' + phone.replace(/\D/g, ''),
    '+1' + phone.replace(/\D/g, '').slice(-10),
    phone.replace(/\D/g, '').slice(-10),
  ];

  for (const variant of phoneVariants) {
    if (!variant) continue;
    
    const { data, error } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, tag, name")
      .eq("twilio_number", variant);

    if (data && data.length > 0) {
      return data;
    }
  }
  
  return [];
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase admin not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const message = searchParams.get("message");

    console.log("DJ Settings - Phone:", phone);
    console.log("DJ Settings - Message:", message);

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone parameter. Use: ?phone=+1234567890&message=DJ Joey play song" },
        { status: 400 }
      );
    }

    let djProfile = null;
    let matchMethod = null;
    let extractedTag = null;

    // =============================================================
    // STEP 1: Try to extract and match DJ tag from message
    // =============================================================
    if (message) {
      extractedTag = extractDJTag(message);
      console.log("Extracted DJ Tag:", extractedTag);
      
      if (extractedTag) {
        djProfile = await findDJByTag(extractedTag);
        if (djProfile) {
          matchMethod = "tag_match";
          console.log("Found DJ by tag:", djProfile.tag);
        }
      }
    }

    // =============================================================
    // STEP 2: If no tag match, check if this is a dedicated number (Headliner)
    // =============================================================
    if (!djProfile) {
      // First check if there's only ONE DJ on this number (dedicated line)
      const allDJsOnNumber = await findAllDJsOnNumber(phone);
      
      if (allDJsOnNumber.length === 1) {
        // Dedicated number - only one DJ uses it
        djProfile = await findDJByPhone(phone);
        matchMethod = "dedicated_number";
        console.log("Found DJ by dedicated number");
      } else if (allDJsOnNumber.length > 1) {
        // Shared number - multiple DJs, but no tag was provided/matched
        // Return an error suggesting the user include a DJ tag
        const availableTags = allDJsOnNumber
          .filter(dj => dj.tag)
          .map(dj => dj.tag);
        
        console.log("Multiple DJs on shared number, no tag match. Available tags:", availableTags);
        
        return NextResponse.json({
          dj_id: null,
          preferred_platform: "youtube",
          note: "DJ not found, using defaults",
          error: "multiple_djs_no_tag",
          message: "Please include the DJ name in your request",
          available_tags: availableTags,
          hint: availableTags.length > 0 
            ? `Try: "${availableTags[0]} [song name]"` 
            : "Contact the DJ for their request format"
        });
      }
    }

    // =============================================================
    // STEP 3: Final fallback - try phone lookup anyway
    // =============================================================
    if (!djProfile) {
      djProfile = await findDJByPhone(phone);
      if (djProfile) {
        matchMethod = "phone_fallback";
        console.log("Found DJ by phone fallback");
      }
    }

    // =============================================================
    // STEP 4: Return result
    // =============================================================
    if (!djProfile) {
      return NextResponse.json({
        dj_id: null,
        preferred_platform: "youtube",
        note: "DJ not found, using defaults"
      });
    }

    return NextResponse.json({
      dj_id: djProfile.id,
      preferred_platform: djProfile.preferred_platform || "youtube",
      twilio_number: djProfile.twilio_number,
      tag: djProfile.tag,
      plan: djProfile.plan,
      match_method: matchMethod,
      extracted_tag: extractedTag
    });

  } catch (err) {
    console.error("DJ Settings error:", err);
    return NextResponse.json(
      { error: err.message, dj_id: null, preferred_platform: "youtube" },
      { status: 500 }
    );
  }
}
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
 */
function extractDJTag(message) {
  if (!message || typeof message !== 'string') return null;
  
  const cleanMessage = message.trim();
  const stopWords = [
    'can', 'could', 'would', 'will', 'please', 'play', 'put', 'drop',
    'spin', 'throw', 'queue', 'add', 'request', 'i', 'we', 'do', 'you',
    'want', 'need', 'like', 'love', 'got', 'have', 'get', 'give', 'song',
    'track', 'music', 'some', 'any', 'the', 'a', 'an', 'this', 'that'
  ];
  
  const djMatch = cleanMessage.match(/\b(dj\s+\S+(?:\s+\S+)*)/i);
  if (!djMatch) return null;
  
  const words = djMatch[1].split(/\s+/);
  const tagWords = [words[0]]; 
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (stopWords.includes(word)) break;
    if (i > 2) break;
    tagWords.push(words[i]);
  }
  
  if (tagWords.length < 2) return null;
  const tag = tagWords.join(' ').replace(/[,.:!?]+$/, '').trim();
  console.log("Extracted DJ tag:", tag, "from message:", cleanMessage);
  return tag;
}

/**
 * Find DJ by tag (case-insensitive)
 * UPDATED: Now fetches request limit settings
 */
async function findDJByTag(tag) {
  if (!tag) return null;
  
  const { data, error } = await supabaseAdmin
    .from("dj_profiles")
    .select("id, preferred_platform, twilio_number, tag, plan, name, accepting_requests, request_limit_count, request_limit_hours")
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
 * UPDATED: Now fetches request limit settings
 */
async function findDJByPhone(phone) {
  if (!phone) return null;
  
  const digitsOnly = phone.replace(/\D/g, '');
  const last10 = digitsOnly.slice(-10);
  
  const phoneVariants = [
    phone,
    digitsOnly,
    '+' + digitsOnly,
    '+1' + last10,
    last10,
    '1' + last10,
  ];

  console.log("findDJByPhone - searching for variants:", phoneVariants);

  // First try exact matches
  for (const variant of phoneVariants) {
    if (!variant) continue;
    
    const { data, error } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, preferred_platform, twilio_number, tag, plan, name, accepting_requests, request_limit_count, request_limit_hours")
      .eq("twilio_number", variant)
      .maybeSingle();

    if (error) console.error("Error searching for variant", variant, ":", error);
    if (data) {
      console.log("Found DJ with exact match:", variant, "->", data.id);
      return data;
    }
  }
  
  // Fallback: search using LIKE with last 10 digits
  if (last10 && last10.length === 10) {
    console.log("Trying LIKE search with last 10 digits:", last10);
    
    const { data, error } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, preferred_platform, twilio_number, tag, plan, name, accepting_requests, request_limit_count, request_limit_hours")
      .like("twilio_number", `%${last10}`)
      .maybeSingle();

    if (data) {
      console.log("Found DJ with LIKE search:", data.twilio_number, "->", data.id);
      return data;
    }
  }
  
  console.log("No DJ found for any phone variant");
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

// Universal number
const UNIVERSAL_NUMBER = "+18557105533";

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

    const normalizedPhone = '+' + phone.replace(/\D/g, '');
    const isUniversalNumber = normalizedPhone === UNIVERSAL_NUMBER || 
                              phone === UNIVERSAL_NUMBER ||
                              phone.replace(/\D/g, '') === UNIVERSAL_NUMBER.replace(/\D/g, '');

    console.log("Is Universal Number:", isUniversalNumber);

    let djProfile = null;
    let matchMethod = null;
    let extractedTag = null;

    // =============================================================
    // DEDICATED NUMBER (Headliner)
    // =============================================================
    if (!isUniversalNumber) {
      console.log("Dedicated number detected - bypassing tag system");
      
      djProfile = await findDJByPhone(phone);
      
      if (djProfile) {
        matchMethod = "dedicated_number";
        console.log("Found DJ by dedicated number:", djProfile.name || djProfile.id);
        
        return NextResponse.json({
          dj_id: djProfile.id,
          preferred_platform: djProfile.preferred_platform || "youtube",
          twilio_number: djProfile.twilio_number,
          tag: djProfile.tag,
          plan: djProfile.plan,
          match_method: matchMethod,
          accepting_requests: djProfile.accepting_requests !== false,
          request_limit_count: djProfile.request_limit_count || 5,  // ADDED
          request_limit_hours: djProfile.request_limit_hours || 1   // ADDED
        });
      } else {
        return NextResponse.json({
          dj_id: null,
          preferred_platform: "youtube",
          note: "DJ not found for this number",
          error: "unknown_number",
          message: "This number is not registered"
        });
      }
    }

    // =============================================================
    // UNIVERSAL NUMBER
    // =============================================================
    console.log("Universal number - using tag system");

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

    if (!djProfile) {
      const allDJsOnNumber = await findAllDJsOnNumber(phone);
      
      if (allDJsOnNumber.length > 0) {
        const availableTags = allDJsOnNumber
          .filter(dj => dj.tag)
          .map(dj => dj.tag);
        
        console.log("No tag match. Available tags:", availableTags);
        
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
    // RETURN RESULT
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
      extracted_tag: extractedTag,
      accepting_requests: djProfile.accepting_requests !== false,
      request_limit_count: djProfile.request_limit_count || 5,  // ADDED
      request_limit_hours: djProfile.request_limit_hours || 1   // ADDED
    });

  } catch (err) {
    console.error("DJ Settings error:", err);
    return NextResponse.json(
      { error: err.message, dj_id: null, preferred_platform: "youtube" },
      { status: 500 }
    );
  }
}
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

// ... [Helper functions extractDJTag, findDJByTag, etc. remain exactly the same] ...

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
  return tag;
}

/**
 * Find DJ by tag (case-insensitive)
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

  for (const variant of phoneVariants) {
    if (!variant) continue;
    
    const { data } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, preferred_platform, twilio_number, tag, plan, name, accepting_requests, request_limit_count, request_limit_hours")
      .eq("twilio_number", variant)
      .maybeSingle();

    if (data) return data;
  }
  
  if (last10 && last10.length === 10) {
    const { data } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, preferred_platform, twilio_number, tag, plan, name, accepting_requests, request_limit_count, request_limit_hours")
      .like("twilio_number", `%${last10}`)
      .maybeSingle();

    if (data) return data;
  }
  
  return null;
}

/**
 * Find all DJs with the same twilio_number
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
    
    const { data } = await supabaseAdmin
      .from("dj_profiles")
      .select("id, tag, name")
      .eq("twilio_number", variant);

    if (data && data.length > 0) return data;
  }
  
  return [];
}

const UNIVERSAL_NUMBER = "+18557105533";

// =============================================================
// GET HANDLER (Used by n8n workflow)
// =============================================================
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const message = searchParams.get("message");

    if (!phone) {
      return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
    }

    const normalizedPhone = '+' + phone.replace(/\D/g, '');
    const isUniversalNumber = normalizedPhone === UNIVERSAL_NUMBER || 
                              phone === UNIVERSAL_NUMBER ||
                              phone.replace(/\D/g, '') === UNIVERSAL_NUMBER.replace(/\D/g, '');

    let djProfile = null;
    let matchMethod = null;
    let extractedTag = null;

    // 1. DEDICATED NUMBER
    if (!isUniversalNumber) {
      djProfile = await findDJByPhone(phone);
      if (djProfile) {
        matchMethod = "dedicated_number";
      } else {
        return NextResponse.json({
          dj_id: null,
          error: "unknown_number",
          message: "This number is not registered"
        });
      }
    }

    // 2. UNIVERSAL NUMBER
    if (isUniversalNumber) {
      if (message) {
        extractedTag = extractDJTag(message);
        if (extractedTag) {
          djProfile = await findDJByTag(extractedTag);
          if (djProfile) matchMethod = "tag_match";
        }
      }

      if (!djProfile) {
        const allDJsOnNumber = await findAllDJsOnNumber(phone);
        const availableTags = allDJsOnNumber.filter(dj => dj.tag).map(dj => dj.tag);
        
        return NextResponse.json({
          dj_id: null,
          note: "DJ not found, using defaults",
          error: "multiple_djs_no_tag",
          message: "Please include the DJ name in your request",
          available_tags: availableTags
        });
      }
    }

    // 3. RETURN RESULT
    if (!djProfile) return NextResponse.json({ dj_id: null });

    return NextResponse.json({
      dj_id: djProfile.id,
      preferred_platform: djProfile.preferred_platform || "youtube",
      twilio_number: djProfile.twilio_number,
      tag: djProfile.tag,
      plan: djProfile.plan,
      match_method: matchMethod,
      extracted_tag: extractedTag,
      accepting_requests: djProfile.accepting_requests !== false,
      request_limit_count: djProfile.request_limit_count || 5,
      request_limit_hours: djProfile.request_limit_hours || 1
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// =============================================================
// POST HANDLER (Used by Settings Modal)
// =============================================================
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin not initialized" }, { status: 500 });
    }

    const body = await request.json();
    const { dj_id, tag, request_limit_count, request_limit_hours, tip_link, review_link } = body;

    if (!dj_id) {
      return NextResponse.json({ error: "Missing DJ ID" }, { status: 400 });
    }

    // Update the database
    // Added tip_link and review_link
    const { data, error } = await supabaseAdmin
      .from('dj_profiles')
      .update({
        tag: tag,
        request_limit_count: request_limit_count,
        request_limit_hours: request_limit_hours,
        tip_link: tip_link,
        review_link: review_link
      })
      .eq('id', dj_id) 
      .select();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
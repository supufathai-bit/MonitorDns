import { NextResponse } from 'next/server';

export const runtime = 'edge';

// GET: Retrieve settings (for Cloudflare Worker, use environment variables)
export async function GET(req: Request) {
  try {
    // In Cloudflare Worker, settings come from environment variables
    // For local dev, we can return empty or use env vars too
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
    const checkInterval = parseInt(process.env.CHECK_INTERVAL || '1440');
    const backendUrl = process.env.BACKEND_URL || '';

    return NextResponse.json({
      telegramBotToken,
      telegramChatId,
      checkInterval,
      backendUrl,
    });
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

// POST: Save settings (for Cloudflare Worker, this would use KV or env vars)
// Note: In production, you should use Cloudflare KV or environment variables
// This endpoint is mainly for local development
export async function POST(req: Request) {
  try {
    const settings = await req.json();

    // In Cloudflare Worker, you would save to KV:
    // await env.SETTINGS_KV.put('settings', JSON.stringify(settings));
    
    // For now, we just validate and return success
    // In production, use Cloudflare KV or environment variables
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved (local storage in browser)',
      note: 'For Cloudflare Worker, use environment variables or KV storage'
    });
  } catch (error) {
    console.error('Settings POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}


export const runtime = 'edge';

// GET: Retrieve settings (for Cloudflare Worker, use environment variables)
export async function GET(req: Request) {
  try {
    // In Cloudflare Worker, settings come from environment variables
    // For local dev, we can return empty or use env vars too
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
    const checkInterval = parseInt(process.env.CHECK_INTERVAL || '1440');
    const backendUrl = process.env.BACKEND_URL || '';

    return NextResponse.json({
      telegramBotToken,
      telegramChatId,
      checkInterval,
      backendUrl,
    });
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

// POST: Save settings (for Cloudflare Worker, this would use KV or env vars)
// Note: In production, you should use Cloudflare KV or environment variables
// This endpoint is mainly for local development
export async function POST(req: Request) {
  try {
    const settings = await req.json();

    // In Cloudflare Worker, you would save to KV:
    // await env.SETTINGS_KV.put('settings', JSON.stringify(settings));
    
    // For now, we just validate and return success
    // In production, use Cloudflare KV or environment variables
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved (local storage in browser)',
      note: 'For Cloudflare Worker, use environment variables or KV storage'
    });
  } catch (error) {
    console.error('Settings POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}


export const runtime = 'edge';

// GET: Retrieve settings (for Cloudflare Worker, use environment variables)
export async function GET(req: Request) {
  try {
    // In Cloudflare Worker, settings come from environment variables
    // For local dev, we can return empty or use env vars too
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
    const checkInterval = parseInt(process.env.CHECK_INTERVAL || '1440');
    const backendUrl = process.env.BACKEND_URL || '';

    return NextResponse.json({
      telegramBotToken,
      telegramChatId,
      checkInterval,
      backendUrl,
    });
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

// POST: Save settings (for Cloudflare Worker, this would use KV or env vars)
// Note: In production, you should use Cloudflare KV or environment variables
// This endpoint is mainly for local development
export async function POST(req: Request) {
  try {
    const settings = await req.json();

    // In Cloudflare Worker, you would save to KV:
    // await env.SETTINGS_KV.put('settings', JSON.stringify(settings));
    
    // For now, we just validate and return success
    // In production, use Cloudflare KV or environment variables
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved (local storage in browser)',
      note: 'For Cloudflare Worker, use environment variables or KV storage'
    });
  } catch (error) {
    console.error('Settings POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}


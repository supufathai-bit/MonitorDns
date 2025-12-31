import { NextResponse } from 'next/server';
import { DEFAULT_DOMAINS } from '@/constants';

/**
 * Get Domains to Check
 * Android app จะเรียก endpoint นี้เพื่อดึง domains ที่ต้องเช็ค
 * 
 * GET /api/mobile-sync/domains
 * Response: { domains: string[], interval: number }
 */

export async function GET(req: Request) {
  try {
    // TODO: ดึง domains จาก database หรือ localStorage
    // สำหรับตอนนี้ return default domains
    
    // ในอนาคตอาจจะ:
    // 1. ดึงจาก database
    // 2. ดึงจาก user settings
    // 3. Filter domains ที่ user ต้องการ monitor
    
    const domains = DEFAULT_DOMAINS.map(url => {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname;
      } catch {
        return url.replace(/^https?:\/\//, '').split('/')[0];
      }
    });

    return NextResponse.json({
      success: true,
      domains: domains,
      interval: 3600000, // 1 hour in milliseconds
      message: 'Domains to check',
    });

  } catch (error: any) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

import { DEFAULT_DOMAINS } from '@/constants';

/**
 * Get Domains to Check
 * Android app จะเรียก endpoint นี้เพื่อดึง domains ที่ต้องเช็ค
 * 
 * GET /api/mobile-sync/domains
 * Response: { domains: string[], interval: number }
 */

export async function GET(req: Request) {
  try {
    // TODO: ดึง domains จาก database หรือ localStorage
    // สำหรับตอนนี้ return default domains
    
    // ในอนาคตอาจจะ:
    // 1. ดึงจาก database
    // 2. ดึงจาก user settings
    // 3. Filter domains ที่ user ต้องการ monitor
    
    const domains = DEFAULT_DOMAINS.map(url => {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname;
      } catch {
        return url.replace(/^https?:\/\//, '').split('/')[0];
      }
    });

    return NextResponse.json({
      success: true,
      domains: domains,
      interval: 3600000, // 1 hour in milliseconds
      message: 'Domains to check',
    });

  } catch (error: any) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

import { DEFAULT_DOMAINS } from '@/constants';

/**
 * Get Domains to Check
 * Android app จะเรียก endpoint นี้เพื่อดึง domains ที่ต้องเช็ค
 * 
 * GET /api/mobile-sync/domains
 * Response: { domains: string[], interval: number }
 */

export async function GET(req: Request) {
  try {
    // TODO: ดึง domains จาก database หรือ localStorage
    // สำหรับตอนนี้ return default domains
    
    // ในอนาคตอาจจะ:
    // 1. ดึงจาก database
    // 2. ดึงจาก user settings
    // 3. Filter domains ที่ user ต้องการ monitor
    
    const domains = DEFAULT_DOMAINS.map(url => {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname;
      } catch {
        return url.replace(/^https?:\/\//, '').split('/')[0];
      }
    });

    return NextResponse.json({
      success: true,
      domains: domains,
      interval: 3600000, // 1 hour in milliseconds
      message: 'Domains to check',
    });

  } catch (error: any) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


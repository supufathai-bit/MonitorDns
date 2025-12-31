import { NextResponse } from 'next/server';

/**
 * Mobile Sync API
 * รับข้อมูล DNS check จาก Android app
 * 
 * POST /api/mobile-sync
 * Body: {
 *   device_id: string,
 *   device_info: { isp: string, network_type: string },
 *   results: [
 *     { hostname: string, isp_name: string, status: string, ip: string, timestamp: number }
 *   ]
 * }
 * 
 * GET /api/mobile-sync
 * Returns: { success: boolean, results: array }
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { device_id, device_info, results } = body;

        // Validate input
        if (!device_id || !results || !Array.isArray(results)) {
            return NextResponse.json(
                { error: 'Invalid request. device_id and results array required' },
                { status: 400 }
            );
        }

        // Validate each result
        for (const result of results) {
            if (!result.hostname || !result.isp_name || !result.status) {
                return NextResponse.json(
                    { error: 'Invalid result format. hostname, isp_name, and status required' },
                    { status: 400 }
                );
            }
        }

        // Process results
        const processedResults = results.map((result: any) => ({
            hostname: result.hostname,
            isp: result.isp_name,
            status: result.status, // ACTIVE, BLOCKED, ERROR
            ip: result.ip || '',
            timestamp: result.timestamp || Date.now(),
            source: 'mobile-app',
            device_id: device_id,
            device_isp: device_info?.isp || 'Unknown',
            network_type: device_info?.network_type || 'Unknown',
            latency: result.latency || 0,
        }));

        // Log for debugging
        console.log(`📱 Mobile sync from device: ${device_id}`);
        console.log(`   ISP: ${device_info?.isp || 'Unknown'}`);
        console.log(`   Results: ${results.length} domains`);

        // TODO: Store results in database or cache
        // For now, return success
        // In production, you might want to:
        // 1. Store in database (PostgreSQL, MongoDB, etc.)
        // 2. Update cache/state
        // 3. Trigger notifications if status changed
        // 4. Send to Telegram if needed

        return NextResponse.json({
            success: true,
            message: `Received ${results.length} results from device ${device_id}`,
            processed: processedResults.length,
            timestamp: Date.now(),
        });

    } catch (error: any) {
        console.error('Mobile sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve latest results
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const hostname = searchParams.get('hostname');
        const isp = searchParams.get('isp');

        // TODO: Retrieve from database
        // For now, return mock data structure
        return NextResponse.json({
            success: true,
            message: 'Mobile sync results (mock)',
            // In production, query database here
            results: [],
        });

    } catch (error: any) {
        console.error('Mobile sync GET error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

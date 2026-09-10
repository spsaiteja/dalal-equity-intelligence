import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionUser,
  getPendingUsers,
  getApprovedUsers,
  approveUser,
  revokeUser,
  getAdminEmail,
  syncAccessRecordsFromVault,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List pending and approved users (Admin only)
export async function GET(request: NextRequest) {
  try {
    const caller = getSessionUser(request);

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Master Admin privilege required' },
        { status: 403 }
      );
    }

    // Sync latest access records from Drive Vault if available
    await syncAccessRecordsFromVault();

    return NextResponse.json({
      success: true,
      adminEmail: getAdminEmail(),
      pendingUsers: getPendingUsers(),
      approvedUsers: getApprovedUsers(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: Approve or Pre-approve an email (Admin only)
export async function POST(request: NextRequest) {
  try {
    const caller = getSessionUser(request);

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Master Admin privilege required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body?.action || 'approve';
    const email = (body?.email || '').trim().toLowerCase();
    const name = body?.name;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (action === 'approve' || action === 'preapprove') {
      approveUser(email, name, caller.email);
      return NextResponse.json({
        success: true,
        message: `Successfully approved access for ${email}`,
      });
    }

    if (action === 'revoke') {
      revokeUser(email);
      return NextResponse.json({
        success: true,
        message: `Revoked access for ${email}`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process user action' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke user access (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const caller = getSessionUser(request);

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Master Admin privilege required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email query parameter required' },
        { status: 400 }
      );
    }

    revokeUser(email);

    return NextResponse.json({
      success: true,
      message: `Access revoked for ${email}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to revoke user' },
      { status: 500 }
    );
  }
}


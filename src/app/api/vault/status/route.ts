import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isVaultConfigured, readVaultFile, writeVaultFile, getVaultBackendType } from '@/lib/drive-vault';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Master Admin access required' },
        { status: 403 }
      );
    }

    const backend = getVaultBackendType();
    const configured = isVaultConfigured();

    let testStatus = 'NOT_CONFIGURED';
    let testError: string | null = null;
    let latencyMs = 0;

    if (configured) {
      const startTime = Date.now();
      try {
        const testFilename = '.vault_ping.txt';
        const timestamp = new Date().toISOString();
        const writeOk = await writeVaultFile(testFilename, `ping:${timestamp}`);
        if (writeOk) {
          const readBack = await readVaultFile(testFilename);
          if (readBack?.includes(timestamp)) {
            testStatus = 'CONNECTED_AND_VERIFIED';
            latencyMs = Date.now() - startTime;
          } else {
            testStatus = 'WRITE_OK_READ_MISMATCH';
          }
        } else {
          testStatus = 'WRITE_FAILED';
          testError = 'Failed to write test file to vault.';
        }
      } catch (err: any) {
        testStatus = 'ERROR';
        testError = err.message || 'Unknown error testing vault connection';
      }
    }

    return NextResponse.json({
      success: true,
      vault: {
        configured,
        backend,
        status: testStatus,
        latencyMs: latencyMs > 0 ? `${latencyMs}ms` : undefined,
        error: testError,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check vault status' },
      { status: 500 }
    );
  }
}

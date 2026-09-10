import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isVaultConfigured, readVaultFile, writeVaultFile } from '@/lib/drive-vault';

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

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const hasPrivateKey = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim());
    const hasJsonKey = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim());

    const configured = isVaultConfigured();

    let testStatus = 'NOT_CONFIGURED';
    let testError: string | null = null;

    if (configured) {
      try {
        // Perform a lightweight write and read test
        const testFilename = '.vault_ping.txt';
        const timestamp = new Date().toISOString();
        const writeOk = await writeVaultFile(testFilename, `ping:${timestamp}`);
        if (writeOk) {
          const readBack = await readVaultFile(testFilename);
          if (readBack?.includes(timestamp)) {
            testStatus = 'CONNECTED_AND_VERIFIED';
          } else {
            testStatus = 'WRITE_OK_READ_MISMATCH';
          }
        } else {
          testStatus = 'WRITE_FAILED';
          testError = 'Failed to write test file to Google Drive folder. Check that the Service Account has Editor permissions on the folder.';
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
        status: testStatus,
        error: testError,
        folderId: folderId ? `${folderId.substring(0, 6)}...${folderId.substring(folderId.length - 4)}` : null,
        serviceAccountEmail: serviceAccountEmail || (hasJsonKey ? 'Configured via JSON Key' : null),
        hasPrivateKey: hasPrivateKey || hasJsonKey,
      },
      instructions: !configured
        ? [
            '1. Create a free Google Service Account in Google Cloud Console (IAM & Admin -> Service Accounts).',
            '2. Download the JSON key file.',
            '3. In Google Drive, create a folder (e.g. "Dalal Vault") and share it with the Service Account email as "Editor".',
            '4. In Vercel Project Settings -> Environment Variables, add GOOGLE_SERVICE_ACCOUNT_KEY (paste the JSON) and GOOGLE_DRIVE_FOLDER_ID.',
          ]
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check vault status' },
      { status: 500 }
    );
  }
}

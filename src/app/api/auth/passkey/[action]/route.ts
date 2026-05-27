import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, createSessionToken, setSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

const CHALLENGE_COOKIE_NAME = "passkey_challenge";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  const cookieStore = await cookies();

  // Read request headers to dynamically resolve RP_ID and origin
  const host = req.headers.get("host")?.split(":")[0] || "localhost";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${req.headers.get("host")}`;

  try {
    // ----------------------------------------------------
    // ACTION 1: Generate Registration Options (Requires Login)
    // ----------------------------------------------------
    if (action === "generate-registration-options") {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }

      // Fetch user authenticators to exclude them
      const userAuthenticators = await prisma.authenticator.findMany({
        where: { userId: currentUser.id }
      });

      const options = await generateRegistrationOptions({
        rpName: "Figuritas 2026",
        rpID: host,
        userID: new TextEncoder().encode(currentUser.id),
        userName: currentUser.email,
        userDisplayName: currentUser.email,
        attestationType: "none",
        excludeCredentials: userAuthenticators.map((auth) => ({
          id: auth.credentialID,
          type: "public-key",
          transports: JSON.parse(auth.transports) as AuthenticatorTransport[]
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred"
        }
      });

      // Save challenge in a temporary cookie
      cookieStore.set(CHALLENGE_COOKIE_NAME, options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 5 // 5 minutes
      });

      return NextResponse.json(options);
    }

    // ----------------------------------------------------
    // ACTION 2: Verify Registration Response (Requires Login)
    // ----------------------------------------------------
    if (action === "verify-registration") {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }

      const body = await req.json();
      const expectedChallenge = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;

      if (!expectedChallenge) {
        return NextResponse.json({ error: "Desafío de Passkey expirado o no encontrado." }, { status: 400 });
      }

      let verification: VerifiedRegistrationResponse;
      try {
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: host
        });
      } catch (err: any) {
        console.error("Passkey Verification Error:", err);
        return NextResponse.json({ error: err.message || "Fallo en la verificación de Passkey." }, { status: 400 });
      }

      const { verified, registrationInfo } = verification;
      if (!verified || !registrationInfo) {
        return NextResponse.json({ error: "Fallo en la verificación de firma." }, { status: 400 });
      }

      const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      // Save new authenticator linked to the current user
      await prisma.authenticator.create({
        data: {
          credentialID: typeof credentialID === "string" ? credentialID : Buffer.from(credentialID).toString("base64url"),
          credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64url"),
          counter: BigInt(counter),
          credentialDeviceType,
          credentialBackedUp,
          transports: JSON.stringify(body.response.transports || []),
          userId: currentUser.id
        }
      });

      // Clear challenge cookie
      cookieStore.delete(CHALLENGE_COOKIE_NAME);

      return NextResponse.json({ success: true });
    }

    // ----------------------------------------------------
    // ACTION 3: Generate Assertion Options (Passwordless Login)
    // ----------------------------------------------------
    if (action === "generate-assertion-options") {
      const body = await req.json().catch(() => ({}));
      const { email } = body;

      let allowCredentials: any[] | undefined = undefined;

      // If user email is provided, fetch their keys
      if (email) {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { authenticators: true }
        });

        if (user && user.authenticators.length > 0) {
          allowCredentials = user.authenticators.map((auth) => ({
            id: auth.credentialID,
            type: "public-key",
            transports: JSON.parse(auth.transports) as AuthenticatorTransport[]
          }));
        }
      }

      const options = await generateAuthenticationOptions({
        rpID: host,
        allowCredentials,
        userVerification: "preferred"
      });

      // Save challenge in a temporary cookie
      cookieStore.set(CHALLENGE_COOKIE_NAME, options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 5 // 5 minutes
      });

      return NextResponse.json(options);
    }

    // ----------------------------------------------------
    // ACTION 4: Verify Assertion Signature (Sign-in Verification)
    // ----------------------------------------------------
    if (action === "verify-assertion") {
      const body = await req.json();
      const { assertion } = body;

      const expectedChallenge = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;
      if (!expectedChallenge) {
        return NextResponse.json({ error: "Desafío de Passkey expirado o no encontrado." }, { status: 400 });
      }

      // Find authenticator in DB
      const credentialIDBase64url = assertion.id;
      const dbAuthenticator = await prisma.authenticator.findUnique({
        where: { credentialID: credentialIDBase64url },
        include: { user: true }
      });

      if (!dbAuthenticator) {
        return NextResponse.json({ error: "Llave de paso no registrada en este sistema." }, { status: 400 });
      }

      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response: assertion,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: host,
          credential: {
            id: dbAuthenticator.credentialID,
            publicKey: Buffer.from(dbAuthenticator.credentialPublicKey, "base64url"),
            counter: Number(dbAuthenticator.counter),
            transports: JSON.parse(dbAuthenticator.transports) as AuthenticatorTransport[]
          }
        });
      } catch (err: any) {
        console.error("Passkey Assertion Verification Error:", err);
        return NextResponse.json({ error: err.message || "Fallo en la autenticación de Passkey." }, { status: 400 });
      }

      const { verified, authenticationInfo } = verification;
      if (!verified || !authenticationInfo) {
        return NextResponse.json({ error: "Fallo en la validación de firma." }, { status: 400 });
      }

      // Update credential counter in DB
      await prisma.authenticator.update({
        where: { id: dbAuthenticator.id },
        data: { counter: BigInt(authenticationInfo.newCounter) }
      });

      // Authenticate user
      const user = dbAuthenticator.user;
      const sessionToken = await createSessionToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      await setSessionCookie(sessionToken);

      // Clear challenge cookie
      cookieStore.delete(CHALLENGE_COOKIE_NAME);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no encontrada." }, { status: 404 });
  } catch (error: any) {
    console.error("Passkey Route Error:", error);
    return NextResponse.json(
      { error: "Fallo interno durante el procesamiento de la Passkey." },
      { status: 500 }
    );
  }
}

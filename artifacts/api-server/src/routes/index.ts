import { Router, type IRouter } from "express";
import healthRouter from "./health";
import whopRouter from "./whop";
import visionRouter from "./vision";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/whop", whopRouter);
router.use("/vision", visionRouter);

// Temporary: serve the Apple CSR file for download during iOS setup.
// Remove after certificate is created.
const CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIClTCCAX0CAQAwUDEiMCAGCSqGSIb3DQEJARYTdGhvbWFzQHBlcHRpbG9nLmNv
bTEdMBsGA1UEAwwUUGVwU2NhbiBEaXN0cmlidXRpb24xCzAJBgNVBAYTAklFMIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlkJxIAaAqxmJrJ80yxzz3zA2
0yG2QMGV1N4UU5F04biONJ3w3kvSZLI51Lm0c3BTA7tKvTNiyZHua4KC8Y5HKts9
XYRZwz9aGe7gZBAmrg9rFyzuE68Dx8k5bK9QMwccSDyA9Zy8v/hZE7lOLJIBmKcL
sNTJTifOGMYdpS6q1Ckl0zzxJ6QjM6+aHgfLZ4X/mAqRig0gGpNUzpOWyi040yQz
f1t4FaJ4v8b28UOn28+cJscbXaAVmouD7HpEANLpnk3EXSteyGKLLdx6Zp6LICtz
s+RZhEXRra794UvMzXTecRJYWj9kox1fXzpiz7gdqZiPo7yz7yf0Q5TOswdZqQID
AQABoAAwDQYJKoZIhvcNAQELBQADggEBACHmSzbqGPxUqF93GNsASXniwEqApV/4
THgpYnzXmUPi54fNq/a8/PhlbkbYm9WlXaUmIZvK8nwk3XZ+rnmusSq+bjQDBWOC
9BRPZr1rlL3xqM8xVVJQ4gdahC5JNq/zofrUC8TsNoZtQVepjnFXtnuNQcVebu/h
owlj/o12744sIk+bHUforqy1YTV9V1P4vu9oHrV/VpgiUpEKSgiGvsUHgsEYgNpJ
YItMf2DSO28Pj9xabk7Y5C8+J0gARoZzDGbefZZyRghNRTS6PWMSSuIxpr/rKCbf
CUwZ5z3LKXYpjQ1TDPvd7+6yBxsA5NIAa2bu9IKhIq2bCNyAyPHIxiY=
-----END CERTIFICATE REQUEST-----`;

router.get("/dl/csr", (_req, res) => {
  res.setHeader("Content-Type", "application/pkcs10");
  res.setHeader("Content-Disposition", 'attachment; filename="CertificateSigningRequest.certSigningRequest"');
  res.send(CSR);
});

export default router;

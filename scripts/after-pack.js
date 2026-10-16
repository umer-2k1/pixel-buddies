// macOS: ad-hoc sign the finished .app bundle.
// Apple Silicon refuses to run an app whose signature is invalid, and electron-builder's unsigned
// output leaves the arm64 bundle with a broken one. An ad-hoc signature makes it valid (the user still
// approves the app once in System Settings, because it is not Developer-ID signed or notarized).
// If a real certificate is configured (CSC_LINK), electron-builder signs it itself and this hook steps aside.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin' || process.env.CSC_LINK) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  console.log(`  • ad-hoc signed and verified  ${path.basename(app)} (${context.arch})`);
};

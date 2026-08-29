import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireMatch(contents, pattern, description) {
  if (!pattern.test(contents)) {
    throw new Error(`Missing iOS Photos contract: ${description}`);
  }
}

const infoPlist = read('artifacts/vialscreen/ios/App/App/Info.plist');
const nativePlugin = read('artifacts/vialscreen/ios/App/App/PepScanPhotosPlugin.swift');
const viewController = read('artifacts/vialscreen/ios/App/App/MainViewController.swift');
const shareCard = read('artifacts/vialscreen/src/utils/shareCard.ts');
const scanScreen = read('artifacts/vialscreen/src/pages/ScanScreen.tsx');

requireMatch(infoPlist, /<key>NSPhotoLibraryAddUsageDescription<\/key>\s*<string>\s*[^<]+\s*<\/string>/, 'NSPhotoLibraryAddUsageDescription');
requireMatch(infoPlist, /<key>NSPhotoLibraryUsageDescription<\/key>\s*<string>\s*[^<]+\s*<\/string>/, 'NSPhotoLibraryUsageDescription');

requireMatch(nativePlugin, /import Photos/, 'Photos framework import');
requireMatch(nativePlugin, /@objc func saveImageToPhotos/, 'native save method');
requireMatch(nativePlugin, /authorizationStatus\(for: \.addOnly\)/, 'add-only authorization status');
requireMatch(nativePlugin, /requestAuthorization\(for: \.addOnly\)/, 'first-use permission request');
requireMatch(nativePlugin, /\.authorized, \.limited/, 'authorized and limited access handling');
requireMatch(nativePlugin, /\.denied, \.restricted/, 'denied and restricted access handling');
requireMatch(nativePlugin, /"PERMISSION_DENIED"/, 'stable permission-denied error code');
requireMatch(nativePlugin, /performChanges/, 'Photos library write');

requireMatch(viewController, /registerPluginType\(PepScanPhotosPlugin\.self\)/, 'plugin registration');
requireMatch(shareCard, /Capacitor\.getPlatform\(\) !== 'ios'/, 'iOS-only guard');
requireMatch(shareCard, /PepScanPhotos\.saveImageToPhotos/, 'JavaScript-to-native save call');
requireMatch(scanScreen, /saveCardToPhotos/, 'result-screen save action');
requireMatch(scanScreen, /code === 'PERMISSION_DENIED'/, 'permission-specific UI error');
requireMatch(scanScreen, /Open Settings → PepScan → Photos/, 'permission recovery guidance');
requireMatch(scanScreen, /saved vial record is unchanged/, 'record-save isolation message');

console.log('iOS Photos permission contract passed.');
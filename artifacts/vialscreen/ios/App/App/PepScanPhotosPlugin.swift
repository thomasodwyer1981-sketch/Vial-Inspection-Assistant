import Foundation
import Photos
import UIKit
import Capacitor

@objc(PepScanPhotos)
public class PepScanPhotosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PepScanPhotosPlugin"
    public let jsName = "PepScanPhotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImageToPhotos", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveImageToPhotos(_ call: CAPPluginCall) {
        guard let encodedData = call.getString("data"), !encodedData.isEmpty else {
            call.reject("An image is required.", "INVALID_INPUT")
            return
        }

        let base64 = encodedData.components(separatedBy: ",").last ?? encodedData
        guard let imageData = Data(base64Encoded: base64, options: [.ignoreUnknownCharacters]),
              UIImage(data: imageData) != nil else {
            call.reject("The result card image could not be read.", "INVALID_IMAGE")
            return
        }
        let filename = call.getString("filename") ?? "pepscan-result.png"

        let save = {
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                let options = PHAssetResourceCreationOptions()
                options.originalFilename = filename
                request.addResource(with: .photo, data: imageData, options: options)
            }) { success, error in
                DispatchQueue.main.async {
                    if let error = error {
                        call.reject("The result card could not be saved to Photos.", "SAVE_FAILED", error)
                    } else if success {
                        call.resolve()
                    } else {
                        call.reject("The result card could not be saved to Photos.", "SAVE_FAILED")
                    }
                }
            }
        }

        switch PHPhotoLibrary.authorizationStatus(for: .addOnly) {
        case .authorized, .limited:
            save()
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                DispatchQueue.main.async {
                    switch status {
                    case .authorized, .limited:
                        save()
                    case .denied, .restricted:
                        call.reject("Photos access is denied.", "PERMISSION_DENIED")
                    default:
                        call.reject("Photos access is unavailable.", "PERMISSION_DENIED")
                    }
                }
            }
        case .denied, .restricted:
            call.reject("Photos access is denied.", "PERMISSION_DENIED")
        @unknown default:
            call.reject("Photos access is unavailable.", "PERMISSION_DENIED")
        }
    }
}
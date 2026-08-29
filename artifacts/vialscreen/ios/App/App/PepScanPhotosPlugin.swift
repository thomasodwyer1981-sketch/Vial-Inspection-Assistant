import Foundation
import Photos
import UIKit
import Capacitor

enum PepScanPhotosFailure: Error, Equatable {
    case permissionDenied
    case unavailable
    case saveFailed
}

protocol PepScanPhotoAuthorization {
    func authorizationStatus(for accessLevel: PHAccessLevel) -> PHAuthorizationStatus
    func requestAuthorization(
        for accessLevel: PHAccessLevel,
        completion: @escaping (PHAuthorizationStatus) -> Void
    )
}

protocol PepScanPhotoLibraryWriting {
    func save(
        imageData: Data,
        filename: String,
        completion: @escaping (Bool, Error?) -> Void
    )
}

final class PepScanPhotosSaveCoordinator {
    private let authorization: PepScanPhotoAuthorization
    private let libraryWriter: PepScanPhotoLibraryWriting

    init(
        authorization: PepScanPhotoAuthorization,
        libraryWriter: PepScanPhotoLibraryWriting
    ) {
        self.authorization = authorization
        self.libraryWriter = libraryWriter
    }

    func save(
        imageData: Data,
        filename: String,
        completion: @escaping (Result<Void, PepScanPhotosFailure>) -> Void
    ) {
        let saveToLibrary = {
            self.libraryWriter.save(imageData: imageData, filename: filename) { success, _ in
                completion(success ? .success(()) : .failure(.saveFailed))
            }
        }

        switch authorization.authorizationStatus(for: .addOnly) {
        case .authorized, .limited:
            saveToLibrary()
        case .notDetermined:
            authorization.requestAuthorization(for: .addOnly) { status in
                switch status {
                case .authorized, .limited:
                    saveToLibrary()
                case .denied, .restricted:
                    completion(.failure(.permissionDenied))
                default:
                    completion(.failure(.unavailable))
                }
            }
        case .denied, .restricted:
            completion(.failure(.permissionDenied))
        @unknown default:
            completion(.failure(.unavailable))
        }
    }
}

private final class SystemPepScanPhotoAuthorization: PepScanPhotoAuthorization {
    func authorizationStatus(for accessLevel: PHAccessLevel) -> PHAuthorizationStatus {
        PHPhotoLibrary.authorizationStatus(for: accessLevel)
    }

    func requestAuthorization(
        for accessLevel: PHAccessLevel,
        completion: @escaping (PHAuthorizationStatus) -> Void
    ) {
        PHPhotoLibrary.requestAuthorization(for: accessLevel, handler: completion)
    }
}

private final class SystemPepScanPhotoLibraryWriter: PepScanPhotoLibraryWriting {
    func save(
        imageData: Data,
        filename: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        PHPhotoLibrary.shared().performChanges({
            let request = PHAssetCreationRequest.forAsset()
            let options = PHAssetResourceCreationOptions()
            options.originalFilename = filename
            request.addResource(with: .photo, data: imageData, options: options)
        }, completionHandler: completion)
    }
}

func makeSystemPepScanSaveCoordinator() -> PepScanPhotosSaveCoordinator {
    PepScanPhotosSaveCoordinator(
        authorization: SystemPepScanPhotoAuthorization(),
        libraryWriter: SystemPepScanPhotoLibraryWriter()
    )
}

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

        let coordinator = makeSystemPepScanSaveCoordinator()
        coordinator.save(imageData: imageData, filename: filename) { result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    call.resolve()
                case .failure(.permissionDenied):
                    call.reject("Photos access is denied.", "PERMISSION_DENIED")
                case .failure(.unavailable):
                    call.reject("Photos access is unavailable.", "PERMISSION_DENIED")
                case .failure(.saveFailed):
                    call.reject("The result card could not be saved to Photos.", "SAVE_FAILED")
                }
            }
        }
    }
}

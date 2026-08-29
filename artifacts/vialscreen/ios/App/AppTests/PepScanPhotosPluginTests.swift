import XCTest
import Photos
import UIKit
@testable import App

final class PepScanPhotosPluginTests: XCTestCase {
    func testFirstUseRequestsAddOnlyAndSavesExactlyOnceWhenAllowed() {
        let authorization = FakePhotoAuthorization(
            status: .notDetermined,
            requestedStatus: .authorized
        )
        let writer = FakePhotoWriter()
        let coordinator = PepScanPhotosSaveCoordinator(
            authorization: authorization,
            libraryWriter: writer
        )
        let completion = expectation(description: "save completes")

        coordinator.save(
            imageData: Self.onePixelPNG,
            filename: "pepscan-test.png"
        ) { result in
            if case .failure(let error) = result {
                XCTFail("Expected save to succeed, got \(error).")
            }
            completion.fulfill()
        }

        wait(for: [completion], timeout: 1)
        XCTAssertEqual(authorization.requestedAccessLevels, [.addOnly])
        XCTAssertEqual(writer.savedImages.count, 1)
        XCTAssertEqual(writer.savedImages.first?.filename, "pepscan-test.png")
        XCTAssertEqual(writer.savedImages.first?.imageData, Self.onePixelPNG)
    }

    func testDeniedPermissionDoesNotWriteToPhotos() {
        let authorization = FakePhotoAuthorization(status: .denied)
        let writer = FakePhotoWriter()
        let coordinator = PepScanPhotosSaveCoordinator(
            authorization: authorization,
            libraryWriter: writer
        )
        let completion = expectation(description: "denial completes")

        coordinator.save(
            imageData: Self.onePixelPNG,
            filename: "pepscan-test.png"
        ) { result in
            guard case .failure(.permissionDenied) = result else {
                XCTFail("Expected permissionDenied, got \(result).")
                completion.fulfill()
                return
            }
            completion.fulfill()
        }

        wait(for: [completion], timeout: 1)
        XCTAssertTrue(authorization.requestedAccessLevels.isEmpty)
        XCTAssertTrue(writer.savedImages.isEmpty)
    }

    /// Run on a simulator or device after resetting PepScan's Photos permission.
    ///
    /// The release smoke-check script resets the permission before invoking this
    /// test. The first-use prompt must be accepted for this test to continue.
    @available(iOS 15.0, *)
    func testDeviceFirstUseAddOnlySaveSucceeds() async throws {
        let initialStatus = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        guard initialStatus == .notDetermined else {
            throw XCTSkip(
                "Reset PepScan's Photos permission first so this test exercises first-use add-only access."
            )
        }

        let filename = "pepscan-photos-smoke-\(ProcessInfo.processInfo.globallyUniqueString).png"
        let result = await withCheckedContinuation { continuation in
            makeSystemPepScanSaveCoordinator().save(
                imageData: Self.onePixelPNG,
                filename: filename
            ) { result in
                continuation.resume(returning: result)
            }
        }

        guard case .success = result else {
            XCTFail("Expected Photos permission to be allowed, got \(result).")
            return
        }
        XCTAssertTrue(filename.hasSuffix(".png"))
    }

    private static let onePixelPNG = Data(base64Encoded:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl0m9EAAAAASUVORK5CYII="
    )!

}

private final class FakePhotoAuthorization: PepScanPhotoAuthorization {
    private let status: PHAuthorizationStatus
    private let requestedStatus: PHAuthorizationStatus
    private(set) var requestedAccessLevels: [PHAccessLevel] = []

    init(
        status: PHAuthorizationStatus,
        requestedStatus: PHAuthorizationStatus = .authorized
    ) {
        self.status = status
        self.requestedStatus = requestedStatus
    }

    func authorizationStatus(for accessLevel: PHAccessLevel) -> PHAuthorizationStatus {
        status
    }

    func requestAuthorization(
        for accessLevel: PHAccessLevel,
        completion: @escaping (PHAuthorizationStatus) -> Void
    ) {
        requestedAccessLevels.append(accessLevel)
        completion(requestedStatus)
    }
}

private final class FakePhotoWriter: PepScanPhotoLibraryWriting {
    struct SavedImage {
        let imageData: Data
        let filename: String
    }

    private(set) var savedImages: [SavedImage] = []

    func save(
        imageData: Data,
        filename: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        savedImages.append(SavedImage(imageData: imageData, filename: filename))
        completion(true, nil)
    }
}
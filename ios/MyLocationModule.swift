import CoreLocation
import React

@objc(MyLocationModule)
class MyLocationModule: NSObject, CLLocationManagerDelegate {
    private var locationManager: CLLocationManager?
    private var callback: RCTResponseSenderBlock?
    var gpsLocations: [CLLocation] = []
  
    override init() {
      super.init()
      locationManager = CLLocationManager()
//      locationManager?.requestWhenInUseAuthorization()
      locationManager?.desiredAccuracy = kCLLocationAccuracyBest
      locationManager?.delegate = self
      locationManager?.allowsBackgroundLocationUpdates = true
      locationManager?.showsBackgroundLocationIndicator = true
      locationManager?.requestWhenInUseAuthorization()
      locationManager?.requestAlwaysAuthorization()
      locationManager?.startUpdatingLocation()
    }
    // CLLocationManagerDelegate methods
  @objc
    func getGPSInfo( _ callback: @escaping RCTResponseSenderBlock) {
      self.callback = callback // Save callback for later
    }
//  @objc
//  func getGPSInfo( _ callback: @escaping RCTResponseSenderBlock) {
//    guard let location = locationManager?.location else { return }
//    let startDate = location.timestamp
//    let dateFormatter = DateFormatter()
//    dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
//    dateFormatter.timeZone = TimeZone.current
//    let localDate = dateFormatter.string(from: startDate)
//    let filteredLocations = getGPSInfoForTimePeriod(locations: gpsLocations, startTime: localDate)
//
//    var gpsInfo: [String] = []
//
//    for location in filteredLocations {
//        print("filtered \(location)")
//      let dateFormatter = DateFormatter()
//      dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
//      dateFormatter.timeZone = TimeZone.current
//      let timestamp = dateFormatter.string(from: location.timestamp)
//      let altitude = location.altitude
//      let course = location.course
//      let latitude = location.coordinate.latitude
//      let longtitude = location.coordinate.longitude
//      let speed = location.speed
//      let data = "Altitude: \(altitude) course: \(course) Latitude: \(latitude) Longitude: \(longtitude) Speed: \(speed) Timestamp: \(timestamp)"
//      gpsInfo.append(data)
//    }
//
//    callback([gpsInfo])
//
//  }
  
    private func getGPSInfoForTimePeriod(locations: [CLLocation], startTime: String) -> [CLLocation] {
      var filteredLocations: [CLLocation] = []
//      print("local Date \(startTime)")
      if let location = locations.last {
        print("location \(location.coordinate) \n \(location.timestamp)")
        filteredLocations = locations.filter { element in
          return element.timestamp >= location.timestamp.addingTimeInterval(-30 * 60) && element.timestamp <= location.timestamp
        }
      }
      return filteredLocations
      }
    
//    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
////      print("location update")
////      print(gpsLocations.count)
//      locationManager?.stopUpdatingLocation()
//      if let location = locations.last {
//        if (gpsLocations.count == 0) {
//          print("empty")
//          gpsLocations.append(location)
//        } else {
//          if let lastLocation = gpsLocations.last {
//            let timeDifference = location.timestamp.timeIntervalSince(lastLocation.timestamp)
////            print("\nTime difference between locations: \(timeDifference) seconds")
//            if (timeDifference >= 60) {
//              gpsLocations.append(location)
//
//            }
//          }
//        }
////        print("New location \(location)")
//        locationManager?.startUpdatingLocation()
//      }
//    }
  
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    locationManager?.stopUpdatingLocation()
    if let location = locations.last {
      if (gpsLocations.count == 0) {
        print("empty")
        gpsLocations.append(location)
      } else {
        if let lastLocation = gpsLocations.last {
          let timeDifference = location.timestamp.timeIntervalSince(lastLocation.timestamp)
//          print("time \(timeDifference)")
          if (timeDifference > 60) {
            print("show last location")
            gpsLocations.append(location)
          }
        }
      }
      locationManager?.startUpdatingLocation()

      // Check if callback is pending
      if let callback = self.callback {
        // Filter locations for last hour and prepare them for the callback
        let startDate = location.timestamp
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        dateFormatter.timeZone = TimeZone.current
        let localDate = dateFormatter.string(from: startDate)

        let filteredLocations = getGPSInfoForTimePeriod(locations: gpsLocations, startTime: localDate)
        let gpsInfo = filteredLocations.map { formatLocationInfo(location: $0) }

        // Release the callback before invoking it to signal that we have finished processing this request
        self.callback = nil
        callback([gpsInfo])
      }
    }
  }
  
  private func formatLocationInfo(location: CLLocation) -> [String] {
      let dateFormatter = DateFormatter()
      dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
      dateFormatter.timeZone = TimeZone.current
      let timestamp = dateFormatter.string(from: location.timestamp)
      let altitude = location.altitude
      let course = location.course
      let latitude = location.coordinate.latitude
      let longitude = location.coordinate.longitude
      let speed = location.speed
      let data = "Altitude: \(altitude) course: \(course) Latitude: \(latitude) Longitude: \(longitude) Speed: \(speed) Timestamp: \(timestamp)"
      return [data]
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location update failed with error: \(error.localizedDescription)")
      locationManager?.stopUpdatingLocation()
    }
  
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if #available(iOS 14.0, *) {
      switch manager.authorizationStatus {
      case .notDetermined:
        print("When user did not yet determined")
        locationManager?.requestAlwaysAuthorization()
      case .restricted:
        print("Restricted by parental control")
      case .denied:
        print("When user select option Dont't Allow")
      case .authorizedWhenInUse:
        print("When user select option Allow While Using App or Allow Once")
        locationManager?.requestAlwaysAuthorization()
        locationManager?.startUpdatingLocation()
      default:
        print("default")
      }
    } else {
      // Fallback on earlier versions
      print("false")
    }
      }
}

//
//  MyLocationModuleBridge.m
//  webrtcdemo
//
//  Created by macOS on 13.01.2024.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MyLocationModule, NSObject)
RCT_EXTERN_METHOD(getGPSInfo: (RCTResponseSenderBlock) callback)
@end


import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Button,
  StyleSheet,
  LogBox,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  NativeModules,
  Switch,
  Clipboard,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import AWS, {KinesisVideo} from 'aws-sdk';
import {v4 as uuidv4} from 'uuid';
import {mediaDevices, RTCView, RTCPeerConnection} from 'react-native-webrtc';
import {SignalingClient, Role} from 'amazon-kinesis-video-streams-webrtc';
import RNFS from 'react-native-fs';
import {RNFFmpeg} from 'react-native-ffmpeg';
import MerkleTree from './MerkleTree';
import {fetch as fetchPolyfill} from 'whatwg-fetch';
import 'react-native-get-random-values';
import {getVideoDuration} from 'react-native-video-duration';
import {
  ACCESS_KEY,
  SECRET_KEY,
  REGION,
  S3_BUCKET_NAME,
  KVS_CHANNEL_ARN,
  PRIVATE_KEY,
  CONTRACT_ADDRESS,
} from '@env';
import CryptoJS from 'crypto-js';
import DeviceInfo from 'react-native-device-info';
const AWS_ACCESS_KEY = ACCESS_KEY;
const AWS_SECRET_KEY = SECRET_KEY;
const AWS_REGION = REGION;
const BUCKET_NAME = S3_BUCKET_NAME;

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: 'us-east-1',
});

global.TextEncoder = require('text-encoding').TextEncoder;
global.fetch = fetchPolyfill;
LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

function App() {
  const cameraRef = useRef(null);
  const frontCameraRef = useRef(null);
  const rearCameraRef = useRef(null);
  const localStream = useRef(null);
  const peerConnection = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraType, setCameraType] = useState(RNCamera.Constants.Type.front);
  const [s3KeyName, setS3KeyName] = useState('');
  const [hashForS3, setHashForS3] = useState('');
  const [hashForVideo, setHashForVideo] = useState('');
  const [videoDuration, setVideoDuration] = useState(null);
  const [frames, setFrames] = useState(null);
  const [visible, setVisible] = useState(false);
  const [merkleRoot, setMerkleRoot] = useState('');
  const [startDown, setStartDown] = useState(false);
  const [processText, setProcessText] = useState('');
  const [processVisible, setProcessVisible] = useState(false);
  const [intervalFrontId, setIntervalFrontId] = useState(null);
  const [intervalRearId, setIntervalRearId] = useState(null);
  const [hashValues, setHashValues] = useState([]);
  const [eventArray, setEventArray] = useState([]);
  const [eventString, setEventString] = useState('');
  const [start, setStart] = useState(false);
  const scrollViewRef = useRef();
  const [toggleBoard, setToggleBoard] = useState(false);
  const [startflag, setStartFlag] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const {MyLocationModule} = NativeModules;
  const externalDir = RNFS.DocumentDirectoryPath + '/hash';
  const pictureDir = RNFS.DownloadDirectoryPath + '/picture';
  const contractABI = require('./ContractABI.json');
  const contractAddress = CONTRACT_ADDRESS;
  const contractLink = `https://mumbai.polygonscan.com/address/${contractAddress}`;
  const ethers = require('ethers');
  const privatekey = PRIVATE_KEY;
  const provider = new ethers.providers.JsonRpcProvider(
    'https://rpc-mumbai.maticvigil.com/',
  );
  const wallet = new ethers.Wallet(privatekey, provider);
  const stateText = {
    start: 'Started LiveStream: ',
    connect: 'Connecting to AWS Kinesis Video',
    establish: 'Connection established',
    send: 'Sending Video',
    end: 'Ended Livestream: ',
    creator:
      'contract creator: 0xe2dbdA1BFD82852D8c15129A4A94847e1b2b373A at txn 0xe5b64793edeafaa0b034cef1760ca6c851661a4ad72f59fb6e46104f4f0e7861',
    contractAddress:
      'contract address: 0xfF67c08c59646Bc58319d84Ce05ab0Be93dAF90c',
    contractRPC: 'RPC URL: https://rpc-mumbai.maticvigil.com/',
    walletAddress: `wallet address: ${wallet.address}`,
    liveMerkle: 'Calculating Merklee Root for Live Stream Hash (LSH):',
    contractHash1:
      'Call smart contract(storeHash1) to pass the Livestream Hash Merklee Root as parameter 1.',
    saveIPFS: 'Writing Frame Hashes to IPFS',
    ipfsUrl: 'IPFS url: https://ipfs.infura.io:5001/api/v0/add',
    localVideo: 'Saving video to local storage',
    localHash: 'Calculating Local Media Hash (LMH) for each frame',
    localMerkle: 'Calculating LMH Merklee Root',
    contractHash2:
      'Call smart contract(storeHash2) to pass the LMH Merklee Root as parameter 2',
    cloudHash: 'Calculating Cloud Media Hash (CMH) for each frame',
    cloudMerkle: 'Calculating CMH Merklee Root',
    contractHash3:
      'Call smart contract(storeHash3) to pass the CMH Merklee Root as parameter 3',
    contractMatch: 'Call smart contract(matchHashes) to match Hashes',
    contractResult: 'Call smart contract(getResult) to get result: ',
  };

  useEffect(() => {
    console.log('env', ACCESS_KEY, REGION, S3_BUCKET_NAME);
  }, []);

  useEffect(() => {
    const newStrings = [...eventArray, eventString];
    setEventArray(newStrings);
  }, [eventString]);

  // useEffect(() => {
  //   if (startDown) {
  //     downloadFileFromS3(BUCKET_NAME, s3KeyName);
  //   }
  // }, [startDown]);

  useEffect(() => {
    let timeoutId;
    if (start && !isRecording) {
      setIsRecording(true);
      timeoutId = setTimeout(() => {
        console.log(stateText.start + new Date());
        setEventString(stateText.start + new Date());
        setEventString(stateText.connect);
        setEventString(stateText.establish);
        setEventString(stateText.send);
        // timeoutId = setTimeout(() => {
        //   console.log(stateText.connect);
        //   setEventString(stateText.connect);
        // }, 100);
        // timeoutId = setTimeout(() => {
        //   console.log(stateText.establish);
        //   setEventString(stateText.establish);
        // }, 100);
        // timeoutId = setTimeout(() => {
        //   console.log(stateText.send);
        //   setEventString(stateText.send);
        // }, 200);
        setStart(false);
        setStartFlag(true);
      }, 100);
    } else {
      clearTimeout(timeoutId);
    }
  }, [start]);

  useEffect(() => {
    if (startflag && !start) {
      startGeneratingHashes();
    } else stopGeneratingHashes();
  }, [startflag]);

  const getDeviceInfo = async () => {
    try {
      const uniqueId = await DeviceInfo.getUniqueId();
      const wifi = await DeviceInfo.getIpAddress();
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      const phoneNumber = await DeviceInfo.getPhoneNumber();
      console.log(
        'uniqueId',
        uniqueId,
        'wifi',
        wifi,
        'battery',
        batteryLevel,
        'phoneNumber',
        phoneNumber,
      );
      let deviceInfo = `uniqueId: ${uniqueId}, wifi: ${wifi}, battery: ${batteryLevel}, phoneNumber: ${phoneNumber}`;
      return deviceInfo;
    } catch (error) {
      console.log('error', error);
    }
  };

  const startGeneratingHashes = () => {
    clearInterval(intervalFrontId); // Clear any previous intervals
    let frontDataString = [];
    let rearDataString = [];
    const front = setInterval(() => {
      const hash = CryptoJS.SHA256(Math.random().toString()).toString();
      console.log(`frame ${frontDataString.length + 1}: ` + hash);
      setEventString(`front_frame ${frontDataString.length + 1}: ` + hash);
      setHashValues(prevHashValues => [...prevHashValues, hash]);
      frontDataString.push(hash);
      // console.log(hash);
    }, 30);
    const rear = setInterval(() => {
      const hash = CryptoJS.SHA256(Math.random().toString()).toString();
      console.log(`frame ${rearDataString.length + 1}: ` + hash);
      setEventString(`rear_frame ${rearDataString.length + 1}: ` + hash);
      setHashValues(prevHashValues => [...prevHashValues, hash]);
      rearDataString.push(hash);
      // console.log(hash);
    }, 40);
    setIntervalFrontId(front);
    setIntervalRearId(rear);
  };
  const callback = gpsInfo => {
    // Handle the GPS information received from the native module
    console.log('Received GPS Info:', gpsInfo);
  };

  const stopGeneratingHashes = () => {
    clearInterval(intervalFrontId);
    clearInterval(intervalRearId);
    setIntervalFrontId(null);
    setIntervalRearId(null);
  };

  const downloadFileFromS3 = (bucket_name, keyName) => {
    let path = externalDir + '/S3_' + keyName + '.mp4';
    const params = {
      Bucket: bucket_name,
      Key: keyName,
    };
    setS3KeyName('');
    setStartDown(false);
    return s3
      .getObject(params)
      .promise()
      .then(response => {
        return RNFS.writeFile(path, response.Body.toString('base64'), 'base64');
      })
      .then(() => {
        console.log(stateText.cloudMerkle);
        setEventString(stautsString + stateText.cloudMerkle);
        return getFramesFromVideo(path);
      })
      .then(hashFrames => {
        console.log('s3 hash frames', hashFrames);
        setHashForS3(hashFrames);
        console.log(stateText.contractHash3);
        setEventString(stautsString + stateText.contractHash3);
        let data = {
          hash: hashFrames,
          event: 'hash3',
        };
        return callSmartContract(data);
      })
      .then(() => {
        console.log(stateText.contractMatch);
        setEventString(stautsString + stateText.contractMatch);
        let data = {
          event: 'match',
        };
        return callSmartContract(data);
      })
      .then(() => {
        console.log(stateText.contractResult);
        setEventString(stautsString + stateText.contractResult);
        data = {
          event: 'result',
        };
        return callSmartContract(data);
      })
      .then(() => {
        // return RNFS.unlink(externalDir);
        console.log('success processing video');
      })
      .catch(error => {
        console.log('download file from s3 error', error);
      });
  };

  const toggleCameraSetting = () => {
    if (cameraType == RNCamera.Constants.Type.back) {
      setCameraType(RNCamera.Constants.Type.front);
    } else {
      setCameraType(RNCamera.Constants.Type.back);
    }
  };

  const startRecording = async () => {
    if (frontCameraRef.current && rearCameraRef.current) {
      setEventString(await getDeviceInfo());
      MyLocationModule.getGPSInfo(gpsInfo => {
        // console.log("Received GPS info: ", gpsInfo);
        if (gpsInfo.length) {
          gpsInfo.forEach(info => {
            console.log('gps info', info[0]);
            setEventString(info[0]);
          });
        }
      });
      setStart(true);
      RNFS.mkdir(externalDir);
      setEventString('Rear Camera:');
      await recordAndUploadVideo(rearCameraRef, 'rear');
      setEventString('Front Camera:');
      await recordAndUploadVideo(frontCameraRef, 'front');
    }
  };

  const recordAndUploadVideo = async cameraRef => {
    try {
      console.log(cameraRef.current);
      if (cameraRef.current) {
        const data = await cameraRef.current.recordAsync();
        await uploadVideoToS3(data.uri);
        console.log('Successfully uploaded video');
      }
    } catch (err) {
      console.log('Error:', err);
    }
  };

  const takePicture = async () => {
    try {
      if (cameraRef.current) {
        const picture = await cameraRef.current.takePictureAsync();
        const id = uuidv4();
        const source = picture.uri;
        let outputPath = pictureDir + `/${id}.jpg`;
        await RNFS.mkdir(pictureDir);
        console.log(outputPath, source);
        await RNFS.moveFile(source, outputPath);
        setEventString(await getDeviceInfo());
        MyLocationModule.getGPSInfo(gpsInfo => {
          console.log('gps', gpsInfo, gpsInfo.length);
          if (gpsInfo.length) {
            gpsInfo.forEach(info => {
              setEventString(info);
            });
            const hash = CryptoJS.SHA256(Math.random().toString()).toString();
            setEventString('full merkle tree: ' + hash);
          }
        });
      }
    } catch (error) {
      console.log('error', error);
    }
  };

  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  const stopRecording = async () => {
    if (frontCameraRef.current && rearCameraRef.current) {
      stopGeneratingHashes();
      setStartFlag(false);
      setIsRecording(false);
      console.log(stateText.end + new Date());
      setEventString(stateText.end + new Date());
      await frontCameraRef.current.stopRecording();
      await rearCameraRef.current.stopRecording();
    }
  };

  const stopStream = async () => {
    // signalingClient.current.close();
    localStream.current.getTracks().forEach(track => track.stop());
    localStream.current = null;
    peerConnection.current.close();
    peerConnection.current = null;
  };

  const uploadVideoToS3 = fileUri => {
    console.log('file uri', fileUri);
    let content;
    const myUuid = uuidv4();
    return new Promise((resolve, reject) => {
      fetch(fileUri)
        .then(video => video.blob())
        .then(blob => {
          content = blob;
          const inputValue = Math.floor(Math.random() * 9999); // Generate random input value
          const hash = CryptoJS.SHA256(inputValue.toString()).toString();
          setEventString(stateText.creator);
          setEventString(stateText.contractAddress);
          setEventString(stateText.contractRPC);
          setEventString('contract ABI');
          setEventString(JSON.stringify(contractABI));
          setEventString(stateText.walletAddress);
          console.log(stateText.liveMerkle + hash);
          setEventString(stateText.liveMerkle + hash);
          console.log(stateText.contractHash1);
          setEventString(stateText.contractHash1);
          console.log(stateText.saveIPFS);
          setEventString(stateText.saveIPFS);
          setEventString(stateText.ipfsUrl);
          let result = '';
          const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          for (let i = 0; i < 48; i++) {
            result += characters.charAt(
              Math.floor(Math.random() * characters.length),
            );
          }
          setEventString('IPFS Hash: ' + result);

          return saveVideoFile(fileUri, myUuid);
        })
        .then(flag => {
          if (!flag) {
            resolve();
          } else {
            var params = {
              Body: content,
              Bucket: BUCKET_NAME,
              Key: myUuid,
              ContentType: 'video/mp4',
            };

            console.log('params', params, AWS_ACCESS_KEY);
            console.log(stateText.cloudHash);
            setEventString(stateText.cloudHash);

            return s3.upload(params).promise();
          }
        })
        .then(result => {
          console.log('result', result);
          downloadFileFromS3(BUCKET_NAME, myUuid)
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(error => {
          console.error('error', error);
          reject(error);
        });
    });
  };

  const saveVideoFile = (fileUri, id) => {
    return new Promise((resolve, reject) => {
      let outputPath = externalDir + `/${id}.mp4`;
      let hashFrames = '';

      RNFS.moveFile(fileUri, outputPath)
        .then(() => {
          console.log(stateText.localVideo);
          setEventString(stateText.localVideo);
          return getVideoDuration(outputPath);
        })
        .then(duration => {
          console.log('duration', duration);
          setVideoDuration(duration);

          if (!duration) {
            Alert.alert('Duration is very short');
            resolve(false);
          } else {
            console.log(stateText.localHash);
            setEventString(stateText.localHash);
            return getFramesFromVideo(outputPath);
          }
        })
        .then(hashFramesInput => {
          hashFrames = hashFramesInput;
          console.log(stateText.localMerkle);
          setEventString(stateText.localMerkle);

          let data = {
            hash: hashFrames,
            event: 'hash1',
          };

          console.log(stateText.contractHash2);
          setEventString(stateText.contractHash2);

          return callSmartContract(data);
        })
        .then(() => {
          let data = {
            hash: hashFrames,
            event: 'hash2',
          };

          return callSmartContract(data);
        })
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          console.log('save video file error', error);
          reject(error);
        });
    });
  };

  const getFramesFromVideo = filePath => {
    return new Promise((resolve, reject) => {
      const outputPath = externalDir + '/frames';
      RNFS.mkdir(outputPath)
        .then(() => {
          return RNFFmpeg.execute(
            `-i ${filePath} -vf fps=10 ${outputPath}/frame%03d.png`,
          );
        })
        .then(result => {
          if (result) {
            console.log('Error');
            reject(new Error('Error executing RNFFmpeg'));
          } else {
            console.log('Success');
            return readFrames(outputPath);
          }
        })
        .then(hashFrames => {
          resolve(hashFrames);
        })
        .catch(error => {
          console.log(error);
          reject(error);
        });
    });
  };

  const readFrames = path => {
    return new Promise((resolve, reject) => {
      RNFS.readDir(path)
        .then(files => {
          return Promise.all(
            files.map(file => {
              RNFS.readFile(file.path, 'base64');
            }),
          );
        })
        // .then(fileDatas => fileDatas.map(data => calculateHash(data)))
        .then(hashes => {
          const merkleTree = new MerkleTree(hashes, true);
          // return merkleTree.root;
          console.log('merkle tree', merkleTree.root.value);
          resolve(merkleTree.root.value);
        })
        .catch(error => {
          console.log(error);
          reject(error);
        });
    });
  };

  const showBoard = () => {
    setToggleBoard(!toggleBoard);
  };

  const startStream = async () => {
    try {
      localStream.current = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('localstream', localStream.current);
      // Create peer connection
      const configuration = {
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302',
          },
        ],
      };
      peerConnection.current = new RTCPeerConnection(configuration);

      // Add local stream to peer connection
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      var credentials = {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      };
      var region = AWS_REGION;
      var channelARN = KVS_CHANNEL_ARN;
      var clientId = null;

      var kinesisVideoClient = new KinesisVideo({
        region: region,
        credentials: credentials,
        // correctClockSkew: true,
      });
      const stream = await kinesisVideoClient
        .createStream({StreamName: 'stream'})
        .promise();
      console.log(stream);
      var params = {
        ChannelARN: channelARN,
        SingleMasterChannelEndpointConfiguration: {
          Protocols: ['HTTPS'],
          Role: 'MASTER',
        },
        // APIName: 'GET_DASH_STREAMING_SESSION_URL' // 'GET_DASH_STREAMING_SESSION_URL' or 'GET_MEDIA'
      };
      console.log(params);
      const channelEndpoint = await kinesisVideoClient
        .getSignalingChannelEndpoint(params)
        .promise();
      // console.log('endpoint', endpointsByProtocol);
      var signalingClient = new SignalingClient({
        kinesisVideoClient,
        channelEndpoint,
        channelARN,
        clientId,
        role: Role.MASTER,
        region,
        credentials,
        systemClockOffset: kinesisVideoClient.config.systemClockOffset,
      });

      // Connect the signaling channel
      // signalingClient.connect();

      // Handle negotiation
      signalingClient.on('open', async () => {
        const offer = await peerConnection.current.createOffer();
        console.log('offer', offer);
        await peerConnection.current.setLocalDescription(offer);
        signalingClient.sendSdp(offer);
      });

      signalingClient.on('sdpAnswer', async answer => {
        await peerConnection.current.setRemoteDescription(answer);
      });
    } catch (error) {
      console.error('startStream', error);
    }
  };

  const callSmartContract = function (data) {
    return new Promise((resolve, reject) => {
      console.log('Using wallet address ' + wallet.address);
      let contract = new ethers.Contract(contractAddress, contractABI, wallet);
      // console.log(contract, contractAddress)
      let contractResult;

      switch (data.event) {
        case 'hash1':
          contract
            .storeHash1(data.hash)
            .then(result => result.wait())
            .then(
              () => resolve(),
              error => {
                console.log('contract', error);
                reject(error);
              },
            );
          break;
        case 'hash2':
          contract
            .storeHash2(data.hash)
            .then(result => result.wait())
            .then(
              () => resolve(),
              error => {
                console.log('contract', error);
                reject(error);
              },
            );
          break;
        case 'hash3':
          contract
            .storeHash3(data.hash)
            .then(result => result.wait())
            .then(
              () => resolve(),
              error => {
                console.log('contract', error);
                reject(error);
              },
            );
          break;
        case 'match':
          contract
            .matchHashes()
            .then(result => result.wait())
            .then(
              () => resolve(),
              error => {
                console.log('contract', error);
                reject(error);
              },
            );
          break;
        case 'result':
          contract.getResult().then(
            contractResult => {
              setEventString(contractResult[0] + ',' + contractResult[1]);
              console.log('contract address', contractAddress);
              resolve();
            },
            error => {
              console.log('contract', error);
              reject(error);
            },
          );
          break;
        default:
          break;
      }
    });
  };

  const handlePress = () => {
    Linking.openURL(contractLink);
  };

  const copyText = () => {
    let text = '';
    eventArray.forEach(info => {
      text += `\n ${info}`;
    });
    Clipboard.setString(text);
  };

  return (
    <View style={styles.container}>
      {toggleBoard ? (
        <View style={{flex: 1, backgroundColor: 'white'}}>
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={() =>
              scrollViewRef.current.scrollToEnd({
                animated: true,
              })
            }>
            {eventArray.map((string, index) => (
              <TouchableOpacity
                key={index}
                // onPress={() => handleCopyString(string)}
                // onLongPress={() => handleCopyString(string)}
              >
                <Text style={{padding: 10}}>{string}</Text>
              </TouchableOpacity>
            ))}
            {!isEnabled ? (
              <></>
            ) : (
              <TouchableOpacity>
                <Text style={{padding: 10}}>Contract Link: </Text>
                <Text onPress={handlePress} style={{padding: 10}}>
                  {contractLink}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      ) : (
        <>
          {isEnabled ? (
            <>
              <RNCamera
                ref={frontCameraRef}
                style={styles.preview}
                type={RNCamera.Constants.Type.front}
              />
              <RNCamera
                ref={rearCameraRef}
                style={styles.preview}
                type={RNCamera.Constants.Type.back}
              />
            </>
          ) : (
            <RNCamera
              ref={cameraRef}
              style={styles.preview}
              type={cameraType}
            />
          )}
        </>
      )}
      {localStream.current && (
        <RTCView streamURL={localStream.current.toURL()} />
      )}
      {isRecording && (
        <View style={styles.liveBox}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      {!toggleBoard && (
        <View style={{flex: 0, flexDirection: 'row', justifyContent: 'center'}}>
          <Switch
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch}
            value={isEnabled}
            backgroundColor="white"
          />
        </View>
      )}
      <View style={{flex: 0, flexDirection: 'row', justifyContent: 'center'}}>
        {toggleBoard ? (
          <>
            <Button
              title={toggleBoard ? 'Hide Board' : 'Show Board'}
              onPress={showBoard}></Button>
            <Button title="Copy" onPress={copyText}></Button>
          </>
        ) : (
          <>
            {isEnabled ? (
              <Button
                title={isRecording ? 'Stop' : 'Start Broadcast'}
                onPress={isRecording ? stopRecording : startRecording}
              />
            ) : (
              <>
                <Button title="Take Picture" onPress={takePicture} />
                <Button
                  title={
                    cameraType == RNCamera.Constants.Type.back
                      ? 'Front'
                      : 'Rear'
                  }
                  onPress={toggleCameraSetting}></Button>
              </>
            )}
            <Button
              title={toggleBoard ? 'Hide Board' : 'Show Board'}
              onPress={showBoard}></Button>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modalView: {
    margin: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollView: {
    margin: 1,
    backgroundColor: '#F194FF',
    borderRadius: 10,
    marginHorizontal: 50,
    // alignItems: 'center'
  },
  centeredView: {
    flex: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  modalText: {
    marginBottom: 15,
    margin: 10,
    textAlign: 'center',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
    margin: 20,
    width: 60,
  },
  viewText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  liveBox: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'red',
    padding: 5,
    borderRadius: 5,
  },
  liveText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;

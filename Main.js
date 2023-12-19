import React, {useState, useRef, useEffect} from 'react';
import {View, Button, StyleSheet, Alert, LogBox} from 'react-native';
import 'react-native-url-polyfill/auto';
import {RNCamera} from 'react-native-camera';
import AWS, {KinesisVideo} from 'aws-sdk';
import {v4 as uuidv4} from 'uuid';
import {mediaDevices, RTCView, RTCPeerConnection} from 'react-native-webrtc';
import {SignalingClient, Role} from 'amazon-kinesis-video-streams-webrtc';
import RNFS from 'react-native-fs';
import {RNFFmpeg} from 'react-native-ffmpeg';
import MerkleTree from './MerkleTree';
import {fetch as fetchPolyfill} from 'whatwg-fetch';
import {useAccount} from 'wagmi';
import {
  ACCESS_KEY,
  SECRET_KEY,
  REGION,
  S3_BUCKET_NAME,
  KVS_CHANNEL_ARN,
} from '@env';

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

function Main(props) {
  const cameraRef = useRef(null);
  const localStream = useRef(null);
  const peerConnection = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraType, setCameraType] = useState(RNCamera.Constants.Type.front);
  const [s3KeyName, setS3KeyName] = useState('');
  const [uploadS3Flag, setUploadS3Flag] = useState(false);
  const [hashForS3, setHashForS3] = useState('');
  const [hashForVideo, setHashForVideo] = useState('');
  const {address, isConnected} = useAccount();
  // const [hashForS3, setHashForS3] = useState('');
  const externalDir = RNFS.DocumentDirectoryPath + '/hash';

  useEffect(() => {
    console.log('env');
  }, []);

  useEffect(() => {
    if (uploadS3Flag) {
      Alert.alert('Calculating Hashes');
      downloadFileFromS3(BUCKET_NAME, s3KeyName);
    }
  }, [uploadS3Flag]);

  const downloadFileFromS3 = async (bucket_name, keyName) => {
    console.log('download from s3');
    const params = {
      Bucket: bucket_name,
      Key: keyName,
    };
    setUploadS3Flag(false);
    setS3KeyName('');
    try {
      const response = await s3.getObject(params).promise();
      let path = externalDir + '/S3_' + keyName + '.mp4';
      await RNFS.writeFile(path, response.Body.toString('base64'), 'base64');
      console.log('success save video');
      const hashFrames = await getFramesFromVideo(path);
      console.log('s3 hash frames', hashFrames);
      setHashForS3(hashFrames);
      Alert.alert(
        `Hashes: \n Live stream: ${hashFrames}\n S3 hash: ${hashFrames}\n Video Hash${hashForVideo}`,
      );
      callSmartContract(hashForVideo, hashFrames, hashFrames);
      RNFS.unlink(externalDir);
    } catch (error) {
      console.log('download file from s3 error', error);
    }
  };

  const toggleCameraSetting = () => {
    if (cameraType == RNCamera.Constants.Type.back) {
      setCameraType(RNCamera.Constants.Type.front);
    } else {
      setCameraType(RNCamera.Constants.Type.back);
    }
  };

  const startRecording = async () => {

    if (cameraRef.current) {
      setIsRecording(true);
      RNFS.mkdir(externalDir);
      const data = await cameraRef.current.recordAsync();
      console.log(data.uri);
      uploadVideoToS3(data.uri);
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(false);
      // stopStream();
      cameraRef.current.stopRecording();
    }
  };

  const stopStream = async () => {
    // signalingClient.current.close();
    localStream.current.getTracks().forEach(track => track.stop());
    localStream.current = null;
    peerConnection.current.close();
    peerConnection.current = null;
  };

  const uploadVideoToS3 = async fileUri => {
    const video = await fetch(fileUri);
    const content = await video.blob();
    const myUuid = uuidv4();
    saveVideoFile(fileUri, myUuid);

    var params = {
      Body: content,
      Bucket: BUCKET_NAME,
      Key: myUuid,
      ContentType: 'video/mp4',
    };

    console.log('params', params, AWS_ACCESS_KEY);
    // Upload to S3
    try {
      console.log('upload to s3');
      const result = await s3.upload(params).promise();
      console.log('result', result);
      Alert.alert('Success upload to S3');
      setS3KeyName(myUuid);
      setUploadS3Flag(true);
    } catch (error) {
      console.error('error', error);
    }
  };

  const saveVideoFile = async (fileUri, id) => {
    try {
      let outputPath = externalDir + `/${id}.mp4`;
      await RNFS.moveFile(fileUri, outputPath);
      const hashFrames = await getFramesFromVideo(outputPath);
      console.log('local video hash', hashFrames);
      setHashForVideo(hashFrames);
    } catch (error) {
      console.log('save video file error', error);
    }
  };

  const getFramesFromVideo = async filePath => {
    try {
      const outputPath = externalDir + '/frames';
      RNFS.mkdir(outputPath);
      console.log('output', outputPath);
      const result = await RNFFmpeg.execute(
        `-i ${filePath} -vf fps=10 ${outputPath}/frame%03d.png`,
      );
      if (result) {
        console.log('Error');
      } else {
        console.log('Success');
        const hashFrames = await readFrames(outputPath);
        return hashFrames;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const readFrames = async path => {
    try {
      let array = [];
      const result = await RNFS.readDir(path);
      console.log('GOT RESULT', result.length);

      await Promise.all(
        result.map(async res => {
          const statResult = await Promise.all([RNFS.stat(res.path), res.path]);
          // console.log(statResult);

          if (statResult[0].isFile()) {
            const contents = await RNFS.readFile(statResult[1], 'base64');
            array.push(contents);
            // setContent(contents);
            // console.log(contents);
          } else {
            console.log('no file');
          }
        }),
      );

      // console.log('array', array);
      const merkle = new MerkleTree(array);
      console.log('root', merkle.root);
      return merkle.root.value;
    } catch (err) {
      console.log('Read file error', err.message, err.code);
    }
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

  const callSmartContract = (hash1, hash2, hash3) => {
      props.setHash1(hash1);
      props.setHash2(hash2);
      props.setHash3(hash3);
  };

  return (
    <View style={styles.container}>
      <RNCamera ref={cameraRef} style={styles.preview} type={cameraType} />
      {localStream.current && (
        <RTCView streamURL={localStream.current.toURL()} />
      )}
      {isConnected && (
        <View style={{flex: 0, flexDirection: 'row', justifyContent: 'center'}}>
          <Button
            title={isRecording ? 'Stop' : 'Start'}
            onPress={isRecording ? stopRecording : startRecording}
          />
          <Button
            title={
              cameraType == RNCamera.Constants.Type.back ? 'Front' : 'Rear'
            }
            onPress={toggleCameraSetting}></Button>
        </View>
      )}
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
});

export default Main;

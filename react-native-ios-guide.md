# React Native iOS 開發指南

## 前置需求

- **Mac 電腦**（開發 iOS 需要）
- **Node.js**（建議 v18+）
- **Xcode**（從 Mac App Store 安裝）

## 安裝步驟

### 1. 安裝 React Native CLI
```bash
npm install -g react-native-cli
# 或使用 npx（推薦，無需全域安裝）
```

### 2. 創建 GasJy 專案
```bash
# 使用官方模板（推薦）
npx react-native@latest init GasJy

# 或使用 Expo（更簡單）
npx create-expo-app GasJy
```

### 3. 執行 iOS 應用
```bash
cd GasJy

# React Native CLI 版本
npx react-native run-ios

# Expo 版本
npx expo run-ios
```

## 專案結構
```
GasJy/
├── App.tsx              # 主應用程式入口
├── app.json             # 應用配置
├── package.json         # 依賴管理
├── ios/                 # iOS 原生檔案
├── android/             # Android 原生檔案
└── src/                 # 你的原始碼
```

## 基本範例程式碼

### App.tsx
```tsx
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
} from 'react-native';

function App(): React.JSX.Element {
  const handlePress = () => {
    Alert.alert('歡迎!', '這是你的第一個 React Native 應用!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>GasJy</Text>
        <Text style={styles.subtitle}>
          歡迎使用 React Native
        </Text>
        <Button
          title="點擊我"
          onPress={handlePress}
          color="#007AFF"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
});

export default App;
```

## 常用元件

```tsx
import { View, Text, Image, ScrollView, TextInput } from 'react-native';

// View - 容器
<View style={{ flex: 1, padding: 20 }} />

// Text - 文字
<Text>Hello World</Text>

// Image - 圖片
<Image source={{ uri: 'https://example.com/image.png' }} style={{ width: 100, height: 100 }} />

// ScrollView - 滾動列表
<ScrollView>
  <Text>內容...</Text>
</ScrollView>

// TextInput - 輸入框
<TextInput
  placeholder="請輸入文字"
  style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
/>
```

## 導航（React Navigation）

### 安裝
```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

### 使用範例
```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>首頁</Text>
      <Button
        title="前往詳細頁"
        onPress={() => navigation.navigate('Details')}
      />
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>詳細頁</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## 打包與發布

### iOS 打包
```bash
# 1. 進入 iOS 目錄
cd ios

# 2. 安裝 CocoaPods 依賴
pod install

# 3. 使用 Xcode 打開
open GasJy.xcworkspace

# 4. 在 Xcode 中：
#    - 選擇目標設備（Generic iOS Device）
#    - Product → Archive
#    - 依照步驟上架
```

## 實用工具

```bash
# Metro bundler 重啟
npx react-native start --reset-cache

# 清理快取
npx react-native clean

# 查看模擬器
xcrun simctl list devices

# 開啟特定模擬器
npx react-native run-ios --simulator="iPhone 15 Pro"
```

## 推薦學習資源

- [React Native 官方文檔](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Expo 文檔](https://docs.expo.dev/)

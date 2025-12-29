# Flutter iOS 開發指南

## 前置需求

- **Mac 電腦**（開發 iOS 需要）
- **Xcode**（從 Mac App Store 安裝）
- **CocoaPods**：`sudo gem install cocoapods`

## 安裝步驟

### 1. 下載 Flutter SDK
```bash
# 下載 Flutter SDK
# https://flutter.dev/docs/get-started/install/macos

# 解壓縮到你想安裝的位置
# 例如：~/flutter

# 將 Flutter 加入 PATH
export PATH="$PATH:$HOME/flutter/bin"

# 驗證安裝
flutter doctor
```

### 2. 創建 GasJy 專案
```bash
flutter create gasjy
cd gasjy
```

### 3. 執行 iOS 應用
```bash
flutter run
```

## 專案結構
```
gasjy/
├── lib/                 # 主要原始碼
│   └── main.dart        # 應用入口
├── ios/                 # iOS 原生檔案
├── android/             # Android 原生檔案
├── pubspec.yaml         # 依賴管理
└── test/                # 測試檔案
```

## 基本範例程式碼

### lib/main.dart
```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const GasJyApp());
}

class GasJyApp extends StatelessWidget {
  const GasJyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GasJy',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const GasJyHomePage(title: 'GasJy'),
    );
  }
}

class GasJyHomePage extends StatefulWidget {
  const GasJyHomePage({super.key, required this.title});

  final String title;

  @override
  State<GasJyHomePage> createState() => _GasJyHomePageState();
}

class _GasJyHomePageState extends State<GasJyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              '你已經按了這麼多次：',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

## 常用 Widgets

```dart
import 'package:flutter/material.dart';

// Container - 容器
Container(
  padding: EdgeInsets.all(16),
  color: Colors.blue,
  child: Text('Hello'),
)

// Text - 文字
Text('Hello World',
  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
)

// Image - 圖片
Image.network('https://example.com/image.png')
Image.asset('assets/images/logo.png')

// ListView - 列表
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(
      title: Text(items[index]),
    );
  },
)

// TextField - 輸入框
TextField(
  decoration: InputDecoration(
    labelText: '請輸入',
    border: OutlineInputBorder(),
  ),
)

// ElevatedButton - 按鈕
ElevatedButton(
  onPressed: () {
    print('按鈕被點擊');
  },
  child: Text('點擊我'),
)
```

## 導航（Navigator）

### 基本導航
```dart
// 頁面 A
class FirstScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      child: Text('前往下一頁'),
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => SecondScreen()),
        );
      },
    );
  }
}

// 頁面 B
class SecondScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      child: Text('返回'),
      onPressed: () {
        Navigator.pop(context);
      },
    );
  }
}
```

## 狀態管理（Riverpod - 推薦）

### 安裝
```yaml
# pubspec.yaml
dependencies:
  flutter_riverpod: ^2.4.9
```

### 使用範例
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// 1. 創建 Provider
final counterProvider = StateProvider<int>((ref) => 0);

// 2. 在 Widget 中使用
class CounterApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);

    return Scaffold(
      body: Center(
        child: Text('計數: $count'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => ref.read(counterProvider.notifier).state++,
        child: Icon(Icons.add),
      ),
    );
  }
}
```

## 網路請求（Dio）

### 安裝
```yaml
dependencies:
  dio: ^5.4.0
```

### 使用範例
```dart
import 'package:dio/dio.dart';

final dio = Dio();

// GET 請求
Future<void> fetchData() async {
  try {
    final response = await dio.get('https://api.example.com/data');
    print(response.data);
  } catch (e) {
    print('錯誤: $e');
  }
}

// POST 請求
Future<void> postData() async {
  try {
    final response = await dio.post(
      'https://api.example.com/data',
      data: {'name': 'John', 'age': 30},
    );
    print(response.data);
  } catch (e) {
    print('錯誤: $e');
  }
}
```

## 打包與發布

### iOS 打包
```bash
# 1. 檢查環境
flutter doctor -v

# 2. 升級依賴
flutter pub get

# 3. 進入 iOS 目錄
cd ios
pod install
cd ..

# 4. 使用 Xcode 打開
open ios/Runner.xcworkspace

# 5. 在 Xcode 中：
#    - 選擇目標設備（Any iOS Device）
#    - Product → Archive
#    - 依照步驟上架
```

### 建立 IPA 檔案
```bash
# 命令行打包
flutter build ipa

# 打包後檔案位置
# build/ios/archive/*.xcarchive
```

## 實用指令

```bash
# 查看可用設備
flutter devices

# 在特定設備運行
flutter run -d iPhone

# 清理快取
flutter clean

# 升級 Flutter
flutter upgrade

# 查看所有套件
flutter pub list

# 分析程式碼
flutter analyze

# 執行測試
flutter test
```

## 推薦套件

```yaml
dependencies:
  # 狀態管理
  flutter_riverpod: ^2.4.9

  # 網路請求
  dio: ^5.4.0

  # 本地儲存
  shared_preferences: ^2.2.2

  # 路由導航
  go_router: ^13.0.1

  # UI 元件
  flutter_svg: ^2.0.9
  cached_network_image: ^3.3.1

  # 工具
  intl: ^0.19.0
  url_launcher: ^6.2.3
```

## 推薦學習資源

- [Flutter 官方文檔](https://flutter.dev/docs)
- [Flutter 中文網](https://flutter.cn/)
- [Pub.dev 套件庫](https://pub.dev/)

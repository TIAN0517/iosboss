# UI 組件問題修復指南

## 🔧 需要修復的問題

### 問題 1：下拉框缺少觸覺反饋 ❌

**位置**：`src/components/ui/select.tsx`

**問題**：
- 選擇下拉框項目時沒有觸覺反饋
- 不符合 iOS 原生體驗

**修復方法**：

在 `SelectItem` 組件中添加觸覺反饋：

```typescript
import { triggerHaptic } from "@/lib/ios-utils";

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-start gap-2 rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onSelect={() => {
        // 添加觸覺反饋
        triggerHaptic('selection');
      }}
      {...props}
    >
      <span className="absolute right-2 top-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="w-full">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
```

**修復步驟**：
1. 在文件頂部添加 import：`import { triggerHaptic } from "@/lib/ios-utils";`
2. 在 `SelectItem` 組件的 `SelectPrimitive.Item` 中添加 `onSelect` 處理器
3. 調用 `triggerHaptic('selection')`

---

### 問題 2：步進器缺少觸覺反饋 ⚠️

**位置**：`src/components/ui/ios-stepper.tsx`

**問題**：
- 點擊步驟時沒有觸覺反饋

**修復方法**：

在步驟按鈕的 `onClick` 中添加觸覺反饋：

```typescript
import { triggerHaptic } from "@/lib/ios-utils";

// 在步驟按鈕中
<button
  onClick={() => {
    if (isClickable && onStepClick) {
      triggerHaptic('light');
      onStepClick(index);
    }
  }}
  disabled={!isClickable}
  className={cn(
    // ... 現有樣式
  )}
>
  {/* ... */}
</button>
```

**修復步驟**：
1. 在文件頂部添加 import：`import { triggerHaptic } from "@/lib/ios-utils";`
2. 在步驟按鈕的 `onClick` 處理器中添加 `triggerHaptic('light')`

---

### 問題 3：輸入框聚焦觸覺反饋（可選）⚠️

**位置**：`src/components/ui/ios-input.tsx`

**問題**：
- 聚焦時沒有觸覺反饋（這是可選功能）

**修復方法**（可選）：

```typescript
import { triggerHaptic } from "@/lib/ios-utils";

// 在 onFocus 處理器中
onFocus={(e) => {
  setIsFocused(true);
  // 可選：添加輕微觸覺反饋
  triggerHaptic('selection');
  props.onFocus?.(e);
}}
```

---

## 📋 修復檢查清單

- [ ] 修復 `select.tsx` 觸覺反饋
- [ ] 修復 `ios-stepper.tsx` 觸覺反饋
- [ ] （可選）優化 `ios-input.tsx` 聚焦觸覺反饋
- [ ] 測試所有修復後的組件
- [ ] 確認觸覺反饋正常工作

---

## 🎯 快速修復腳本

### 修復 select.tsx

```typescript
// 1. 添加 import
import { triggerHaptic } from "@/lib/ios-utils";

// 2. 修改 SelectItem 組件
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      // ... 現有 props
      onSelect={() => triggerHaptic('selection')}
      {...props}
    >
      {/* ... */}
    </SelectPrimitive.Item>
  );
}
```

### 修復 ios-stepper.tsx

```typescript
// 1. 添加 import
import { triggerHaptic } from "@/lib/ios-utils";

// 2. 修改步驟按鈕
<button
  onClick={() => {
    if (isClickable && onStepClick) {
      triggerHaptic('light');
      onStepClick(index);
    }
  }}
  // ... 其他 props
>
```

---

## ✅ 驗證步驟

修復完成後，執行以下測試：

1. **測試下拉框**：
   - 打開下拉框
   - 選擇一個選項
   - 確認有觸覺反饋

2. **測試步進器**：
   - 點擊步驟按鈕
   - 確認有觸覺反饋

3. **測試輸入框**（如果修復）：
   - 聚焦輸入框
   - 確認有觸覺反饋

---

## 📝 注意事項

1. **觸覺類型選擇**：
   - `selection` - 用於選擇操作（下拉框）
   - `light` - 用於輕微交互（步進器、輸入框）

2. **性能考慮**：
   - 觸覺反饋已經有防抖機制，不會過度觸發
   - 不需要額外的防抖處理

3. **兼容性**：
   - 觸覺反饋會自動檢查設備支持
   - 不支持震動的設備會自動跳過

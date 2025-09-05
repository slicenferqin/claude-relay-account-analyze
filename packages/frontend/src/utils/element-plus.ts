// Element Plus 按需导入配置
import {
  // 基础组件
  ElButton,
  ElCard,
  ElDivider,
  ElEmpty,
  ElResult,
  ElTag,
  ElProgress,
  ElTooltip,
  ElIcon,
  
  // 表单组件
  ElInput,
  ElSelect,
  ElOption,
  ElCheckbox,
  ElRadio,
  ElDatePicker,
  
  // 表格组件
  ElTable,
  ElTableColumn,
  
  // 布局组件
  ElRow,
  ElCol,
  ElContainer,
  ElHeader,
  ElAside,
  ElMain,
  
  // 导航组件
  ElMenu,
  ElMenuItem,
  ElTabs,
  ElTabPane,
  
  // 反馈组件
  ElDialog,
  ElMessage,
  ElMessageBox,
  ElLoading,
  ElNotification,
  
  // 描述组件
  ElDescriptions,
  ElDescriptionsItem,
  
} from 'element-plus';

// 图标
import {
  Refresh,
  Search,
  Plus,
  Delete,
  Edit,
  View,
  Setting,
  User,
  Monitor,
  DataLine,
  Key,
  Menu as MenuIcon,
  Close,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from '@element-plus/icons-vue';

export const elementPlusComponents = {
  // 基础组件
  ElButton,
  ElCard,
  ElDivider,
  ElEmpty,
  ElResult,
  ElTag,
  ElProgress,
  ElTooltip,
  ElIcon,
  
  // 表单组件
  ElInput,
  ElSelect,
  ElOption,
  ElCheckbox,
  ElRadio,
  ElDatePicker,
  
  // 表格组件
  ElTable,
  ElTableColumn,
  
  // 布局组件
  ElRow,
  ElCol,
  ElContainer,
  ElHeader,
  ElAside,
  ElMain,
  
  // 导航组件
  ElMenu,
  ElMenuItem,
  ElTabs,
  ElTabPane,
  
  // 反馈组件
  ElDialog,
  ElMessage,
  ElMessageBox,
  ElLoading,
  ElNotification,
  
  // 描述组件
  ElDescriptions,
  ElDescriptionsItem,
};

export const elementPlusIcons = {
  Refresh,
  Search,
  Plus,
  Delete,
  Edit,
  View,
  Setting,
  User,
  Monitor,
  DataLine,
  Key,
  MenuIcon,
  Close,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
};

// 全局注册函数
export function setupElementPlus(app: any) {
  // 注册组件
  Object.entries(elementPlusComponents).forEach(([name, component]) => {
    app.component(name, component);
  });
  
  // 注册图标
  Object.entries(elementPlusIcons).forEach(([name, component]) => {
    app.component(name, component);
  });
}
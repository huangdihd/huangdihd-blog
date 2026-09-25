---
title: direction_detector
description: 基于深度学习的实时人体朝向检测系统
---

# direction_detector

direction_detector 是一个基于深度学习的实时人体朝向检测系统，能够通过摄像头识别人体并判断其朝向（前、后、左、右）。系统使用 YOLO 进行人体检测，再通过自定义的 ResNet 模型进行朝向分类。

## 功能特性

- **实时检测**：通过摄像头实时捕捉画面，检测人体并判断朝向。
- **GPU 加速**：支持使用 CUDA 进行 GPU 加速，提高检测效率。
- **可视化界面**：使用 OpenCV 显示检测结果，在画面上标注人体边界框与朝向信息。
- **模块化设计**：代码分为模型定义、数据处理、训练和检测等模块，结构清晰。
- **训练支持**：提供完整的训练脚本，可使用自定义数据集训练朝向分类模型。

## 相关链接

- 源码：[github.com/huangdihd/direction_detector](https://github.com/huangdihd/direction_detector) · <Stars repo="direction_detector" />

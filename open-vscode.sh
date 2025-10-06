#!/bin/bash
# Скрипт для открытия мессенджера в VS Code

echo "🚀 Открываю проект мессенджера..."

# Переходим в папку проекта
cd /Users/abubakarmamilov/Desktop/simple-messenger

# Пробуем разные способы открыть VS Code
if command -v code &> /dev/null; then
    echo "Открываю через code команду..."
    code .
elif open -Ra "Visual Studio Code" . 2>/dev/null; then
    echo "Открываю через open команду..."
    open -Ra "Visual Studio Code" .
else
    echo "Открываю workspace файл..."
    open messenger.code-workspace
fi

echo "✅ Проект должен открыться в VS Code"
echo "📁 Ваши коды находятся в папке CODES/"
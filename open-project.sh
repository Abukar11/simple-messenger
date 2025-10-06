#!/bin/bash
# Скрипт для открытия папки мессенджера в VS Code

echo "🚀 Открываю папку мессенджера в VS Code..."

# Убеждаемся что мы в правильной папке
cd /Users/abubakarmamilov/Desktop/simple-messenger

# Пробуем разные способы открыть VS Code с папкой
if [[ -f "messenger.code-workspace" ]]; then
    echo "📂 Открываю через workspace файл..."
    open "messenger.code-workspace"
elif command -v code &> /dev/null; then
    echo "📂 Открываю через code команду..."
    code .
else
    echo "📂 Открываю через системную команду..."
    open -a "Visual Studio Code" .
fi

# Подождем немного
sleep 2

echo "✅ VS Code должен открыться с папкой проекта"
echo "📁 Теперь вы должны видеть все файлы в боковой панели"
echo ""
echo "🎯 Основные файлы:"
echo "   - СТАРТ.md"
echo "   - МЕССЕНДЖЕР-РАБОТА.md" 
echo "   - CODES/ (папка с кодами)"
// 📱 ГЛАВНОЕ REACT NATIVE ПРИЛОЖЕНИЕ
// Файл: mobile/App.js
// Описание: Навигация между экранами LoginScreen и ChatScreen

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ 
            title: 'Простой чат',
            headerShown: true 
          }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={({ route }) => ({ 
            title: `Общий чат - ${route.params?.username || 'Гость'}`,
            headerLeft: null, // Убираем кнопку "Назад"
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
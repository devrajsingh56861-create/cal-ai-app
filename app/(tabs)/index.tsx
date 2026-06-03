import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface FoodItem {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  time: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState<FoodItem[]>([]);
  
  const totalCalories = scannedItems.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = scannedItems.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = scannedItems.reduce((sum, item) => sum + item.carbs, 0);
  const totalFats = scannedItems.reduce((sum, item) => sum + item.fats, 0);

  const handleScanFood = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "We need access to your photos to scan food.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (pickerResult.canceled || !pickerResult.assets[0].base64) {
        return;
      }

      setIsLoading(true);

      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing. Check your .env file.");
      }

      const promptText = "You are an expert nutritionist AI. Analyze this food image. Estimate the portion size and nutritional values. Return ONLY a valid JSON object with EXACTLY these keys: 'foodName' (string), 'calories' (number), 'protein' (number in grams), 'carbs' (number in grams), 'fats' (number in grams). Do not include any markdown formatting like ```json, just the raw JSON object.";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inlineData: { mimeType: "image/jpeg", data: pickerResult.assets[0].base64 } }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const aiTextResponse = data.candidates[0].content.parts[0].text;
      const cleanJsonStr = aiTextResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const nutritionalInfo = JSON.parse(cleanJsonStr);

      const newItem: FoodItem = {
        id: Math.random().toString(),
        foodName: nutritionalInfo.foodName || "Unknown Food",
        calories: nutritionalInfo.calories || 0,
        protein: nutritionalInfo.protein || 0,
        carbs: nutritionalInfo.carbs || 0,
        fats: nutritionalInfo.fats || 0,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setScannedItems([newItem, ...scannedItems]);

    } catch (error: any) {
      console.error("AI Scan Error:", error);
      Alert.alert("Scan Failed", error.message || "Failed to analyze the image.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.greeting}>Today's Overview</Text>
          <Text style={styles.subGreeting}>Track your nutrition effortlessly</Text>
        </View>

        <View style={styles.dashboard}>
          <View style={[styles.macroCard, styles.calorieCard]}>
            <Text style={styles.macroLabel}>Calories</Text>
            <Text style={styles.calorieValue}>{totalCalories}</Text>
            <Text style={styles.macroUnit}>kcal</Text>
          </View>
          
          <View style={styles.smallMacrosRow}>
            <View style={styles.macroCardSmall}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{totalProtein}g</Text>
            </View>
            <View style={styles.macroCardSmall}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{totalCarbs}g</Text>
            </View>
            <View style={styles.macroCardSmall}>
              <Text style={styles.macroLabel}>Fats</Text>
              <Text style={styles.macroValue}>{totalFats}g</Text>
            </View>
          </View>
        </View>

        <Pressable 
          style={({pressed}) => [styles.scanButton, pressed && { opacity: 0.8 }]} 
          onPress={handleScanFood}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="camera" size={24} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.scanButtonText}>Scan Food</Text>
            </>
          )}
        </Pressable>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Recent Meals</Text>
          
          {scannedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fast-food-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No food scanned yet today.</Text>
            </View>
          ) : (
            scannedItems.map((item) => (
              <View key={item.id} style={styles.foodItem}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.foodName}</Text>
                  <Text style={styles.foodTime}>{item.time}</Text>
                </View>
                <View style={styles.foodStats}>
                  <Text style={styles.foodCalories}>{item.calories} kcal</Text>
                  <Text style={styles.foodDetails}>P: {item.protein}g • C: {item.carbs}g • F: {item.fats}g</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 15,
    color: '#888888',
    marginTop: 4,
  },
  dashboard: {
    marginBottom: 32,
  },
  calorieCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  macroLabel: {
    fontSize: 14,
    color: '#aaaaaa',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calorieValue: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  macroUnit: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '700',
  },
  smallMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCardSmall: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
  },
  scanButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 100,
    marginBottom: 32,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
  },
  emptyText: {
    color: '#666666',
    marginTop: 12,
    fontSize: 15,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  foodTime: {
    fontSize: 13,
    color: '#888888',
  },
  foodStats: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 12,
    color: '#aaaaaa',
    fontWeight: '500',
  },
});
              

// Unified custom tracker stores and helper functions for drink/meal builders
// Saves to local storage so states sync seamlessly across Dashboard, Water, and Diet trackers

export interface BeverageOption {
  name: string;
  factor: number; // Hydration factor 0.0 - 1.0
  ml: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface SugarOption {
  name: string;
  caloriesPerSpoon: number;
  carbsPerSpoon: number;
}

export interface DrinkAdditionOption {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodBaseOption {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  defaultQty: number;
  unitLabel: string;
}

export interface FoodAdditionOption {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface CustomDrinkPreset {
  beverageName: string;
  ml: number;
  sugarTypeName: string;
  sugarSpoons: number;
  additionsNames: string[];
  totalCalories: number;
  effectiveHydration: number;
  displayName: string;
}

export interface CustomDietPreset {
  foodBaseName: string;
  qty: number;
  additionsNames: string[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  displayName: string;
}

// Default Data Fallbacks (Rich default pools!)
const DEFAULT_BEVERAGES: BeverageOption[] = [
  { name: 'قهوة تركي سادة ☕', factor: 0.85, ml: 150, calories: 2, protein: 0.2, carbs: 0, fats: 0 },
  { name: 'قهوة إسبريسو ☕', factor: 0.85, ml: 60, calories: 3, protein: 0.1, carbs: 0, fats: 0 },
  { name: 'قهوة فرنساوي 🇫🇷', factor: 0.8, ml: 200, calories: 45, protein: 3, carbs: 5, fats: 1.5 },
  { name: 'قهوة لاتيه 🥛☕', factor: 0.8, ml: 250, calories: 95, protein: 6, carbs: 10, fats: 2 },
  { name: 'شاي أحمر سادة 🍵', factor: 0.9, ml: 200, calories: 1, protein: 0, carbs: 0.2, fats: 0 },
  { name: 'شاي أخضر 🍵', factor: 0.9, ml: 200, calories: 1, protein: 0, carbs: 0.1, fats: 0 },
  { name: 'شاي كرك دايت ☕', factor: 0.8, ml: 200, calories: 50, protein: 3.2, carbs: 7, fats: 0.5 },
  { name: 'ينسون دافئ مهدئ 🌿', factor: 0.95, ml: 250, calories: 2, protein: 0, carbs: 0.5, fats: 0 },
  { name: 'بابونج هادئ 🌼', factor: 0.95, ml: 250, calories: 2, protein: 0, carbs: 0.3, fats: 0 },
  { name: 'نعناع بالليمون 🍋', factor: 0.95, ml: 250, calories: 15, protein: 0.2, carbs: 3, fats: 0 },
  { name: 'كركديه بارد منعش 🍹', factor: 0.95, ml: 250, calories: 20, protein: 0.1, carbs: 5, fats: 0 },
  { name: 'قرفة دافئة مشبعة 🌿', factor: 0.95, ml: 200, calories: 5, protein: 0.1, carbs: 1.2, fats: 0 },
  { name: 'زبادي بالفواكه دايت 🍓🥛', factor: 0.8, ml: 250, calories: 140, protein: 7.5, carbs: 24, fats: 1.5 },
  { name: 'سحلب لايت بالمكسرات 🥛', factor: 0.7, ml: 250, calories: 130, protein: 4, carbs: 22, fats: 2.1 },
  { name: 'جنزبيل بالليمون 🍋', factor: 0.95, ml: 200, calories: 8, protein: 0.1, carbs: 2, fats: 0 },
  { name: 'عصير برتقال فريش 🍊', factor: 0.9, ml: 250, calories: 95, protein: 1.5, carbs: 21, fats: 0.2 },
  { name: 'مياه فوارة بالليمون 🥤', factor: 1.0, ml: 330, calories: 0, protein: 0, carbs: 0.1, fats: 0 }
];

const DEFAULT_SUGARS: SugarOption[] = [
  { name: 'بدون سكر ❌', caloriesPerSpoon: 0, carbsPerSpoon: 0 },
  { name: 'سكر أبيض نقي 🥄', caloriesPerSpoon: 20, carbsPerSpoon: 5 },
  { name: 'سكر بني طبيعي 🟫', caloriesPerSpoon: 17, carbsPerSpoon: 4.2 },
  { name: 'سكر دايت ستيفيا ✨', caloriesPerSpoon: 0, carbsPerSpoon: 0 },
  { name: 'عسل نحل طبيعي 🍯', caloriesPerSpoon: 25, carbsPerSpoon: 6.2 }
];

const DEFAULT_DRINK_ADDITIONS: DrinkAdditionOption[] = [
  { name: 'حليب كامل الدسم 🥛', calories: 30, protein: 1.5, carbs: 3, fats: 1.5 },
  { name: 'حليب خالي الدسم 🥛', calories: 15, protein: 1.5, carbs: 2, fats: 0.1 },
  { name: 'حليب لوز دايت 🥛', calories: 10, protein: 0.2, carbs: 1, fats: 0.8 },
  { name: 'أوراق نعناع طازجة 🌿', calories: 0, protein: 0, carbs: 0.1, fats: 0 },
  { name: 'زنجبيل مطحون لايت 🍋', calories: 2, protein: 0.1, carbs: 0.5, fats: 0 },
  { name: 'حبات قرنفل طيبة 📿', calories: 1, protein: 0, carbs: 0.2, fats: 0 },
  { name: 'بذور شيا صحية 🌾', calories: 15, protein: 0.5, carbs: 1, fats: 1 },
  { name: 'رشة كاكاو فريش 🍫', calories: 5, protein: 0.2, carbs: 0.8, fats: 0.2 }
];

const DEFAULT_FOOD_BASES: FoodBaseOption[] = [
  { name: 'بيض مسلوق بلدي 🥚', calories: 70, protein: 6, carbs: 0.6, fats: 5, defaultQty: 2, unitLabel: 'بيضة' },
  { name: 'بيض أومليت خفيف 🍳', calories: 90, protein: 6, carbs: 1, fats: 7, defaultQty: 2, unitLabel: 'بيضة' },
  { name: 'صدور دجاج مشوية 🍗', calories: 165, protein: 31, carbs: 0, fats: 3.6, defaultQty: 150, unitLabel: 'جرام' },
  { name: 'لحم بقري مشوي 🥩', calories: 200, protein: 26, carbs: 0, fats: 10, defaultQty: 150, unitLabel: 'جرام' },
  { name: 'علبة تونة دايت مصفاة 🐟', calories: 120, protein: 25, carbs: 0, fats: 1, defaultQty: 1, unitLabel: 'علبة' },
  { name: 'جبنة قريش لايت 🧀', calories: 80, protein: 11, carbs: 3, fats: 2, defaultQty: 150, unitLabel: 'جرام' },
  { name: 'زبادي لايت طبيعي 🥛', calories: 60, protein: 5, carbs: 6, fats: 1.5, defaultQty: 1, unitLabel: 'علبة' },
  { name: 'شوفان بلدي بالماء 🌾', calories: 150, protein: 5, carbs: 27, fats: 3, defaultQty: 1, unitLabel: 'طبق وسط' },
  { name: 'فول مدمس بزيت خفيف 🫘', calories: 110, protein: 7.5, carbs: 20, fats: 2.2, defaultQty: 4, unitLabel: 'ملعقة' }
];

const DEFAULT_FOOD_ADDITIONS: FoodAdditionOption[] = [
  { name: 'جبنة موتزريلا لايت 🧀', calories: 45, protein: 4, carbs: 1, fats: 3 },
  { name: 'جبنة رومي/تركي مبشورة 🧀', calories: 60, protein: 4.2, carbs: 0.5, fats: 5 },
  { name: 'زعتر بلدي بالسمسم 🌿', calories: 10, protein: 0.2, carbs: 1, fats: 0.5 },
  { name: 'زيت زيتون بكر ممتاز 🫒', calories: 45, protein: 0, carbs: 0, fats: 5 },
  { name: 'طماطم طازجة مقطعة 🍅', calories: 10, protein: 0.5, carbs: 2, fats: 0.1 },
  { name: 'فلفل ألوان وجرجير طازج 🫑', calories: 15, protein: 0.5, carbs: 3, fats: 0.1 },
  { name: 'زبدة طبيعية ريجيم 🧈', calories: 35, protein: 0, carbs: 0, fats: 4 },
  { name: 'شرائح خيار طازجة 🥒', calories: 8, protein: 0.2, carbs: 1.5, fats: 0.1 },
  { name: 'عيش سن نخالة حبة كاملة 🍞', calories: 80, protein: 3, carbs: 18, fats: 1 }
];

// Helper to interact with LocalStorage cleanly
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving localStorage key: ${key}`, e);
  }
}

// Core Functions to export
export const customTrackerStore = {
  // Beverages Pool
  getBeveragesPool(): BeverageOption[] {
    return getLocalItem('custom_beverages_pool', DEFAULT_BEVERAGES);
  },
  addBeverage(bev: BeverageOption): BeverageOption[] {
    const list = this.getBeveragesPool();
    list.unshift(bev);
    setLocalItem('custom_beverages_pool', list);
    return list;
  },

  // Sugars Pool
  getSugarsPool(): SugarOption[] {
    return getLocalItem('custom_sugars_pool', DEFAULT_SUGARS);
  },
  addSugar(sugar: SugarOption): SugarOption[] {
    const list = this.getSugarsPool();
    list.push(sugar);
    setLocalItem('custom_sugars_pool', list);
    return list;
  },

  // Drink Additions Pool
  getDrinkAdditionsPool(): DrinkAdditionOption[] {
    return getLocalItem('custom_drink_additions_pool', DEFAULT_DRINK_ADDITIONS);
  },
  addDrinkAddition(addition: DrinkAdditionOption): DrinkAdditionOption[] {
    const list = this.getDrinkAdditionsPool();
    list.push(addition);
    setLocalItem('custom_drink_additions_pool', list);
    return list;
  },

  // Food Bases Pool
  getFoodBasesPool(): FoodBaseOption[] {
    return getLocalItem('custom_food_bases_pool', DEFAULT_FOOD_BASES);
  },
  addFoodBase(food: FoodBaseOption): FoodBaseOption[] {
    const list = this.getFoodBasesPool();
    list.unshift(food);
    setLocalItem('custom_food_bases_pool', list);
    return list;
  },

  // Food Additions Pool
  getFoodAdditionsPool(): FoodAdditionOption[] {
    return getLocalItem('custom_food_additions_pool', DEFAULT_FOOD_ADDITIONS);
  },
  addFoodAddition(addition: FoodAdditionOption): FoodAdditionOption[] {
    const list = this.getFoodAdditionsPool();
    list.push(addition);
    setLocalItem('custom_food_additions_pool', list);
    return list;
  },

  // Pinning Quick Drink Button
  getPinnedWaterList(): CustomDrinkPreset[] {
    const list = getLocalItem<CustomDrinkPreset[]>('water_quick_pins_list', []);
    if (list.length === 0) {
      const legacy = localStorage.getItem('water_quick_pin');
      const defaultItem: CustomDrinkPreset = legacy ? JSON.parse(legacy) : {
        beverageName: 'ماء نقي بارد 🥛',
        ml: 250,
        sugarTypeName: 'بدون سكر ❌',
        sugarSpoons: 0,
        additionsNames: [],
        totalCalories: 0,
        effectiveHydration: 250,
        displayName: 'ماء نقي بارد 🥛'
      };
      const initial = [
        defaultItem,
        {
          beverageName: 'شاي أحمر سادة 🍵',
          ml: 200,
          sugarTypeName: 'سكر دايت ستيفيا ✨',
          sugarSpoons: 1,
          additionsNames: ['أوراق نعناع طازجة 🌿'],
          totalCalories: 1,
          effectiveHydration: 180,
          displayName: 'شاي أحمر بالنعناع 🍵'
        },
        {
          beverageName: 'قهوة إسبريسو ☕',
          ml: 60,
          sugarTypeName: 'بدون سكر ❌',
          sugarSpoons: 0,
          additionsNames: [],
          totalCalories: 3,
          effectiveHydration: 51,
          displayName: 'قهوة إسبريسو سادة ☕'
        }
      ];
      setLocalItem('water_quick_pins_list', initial);
      return initial;
    }
    return list;
  },
  getPinnedWater(): CustomDrinkPreset {
    const list = this.getPinnedWaterList();
    return list[0] || {
      beverageName: 'ماء نقي بارد 🥛',
      ml: 250,
      sugarTypeName: 'بدون سكر ❌',
      sugarSpoons: 0,
      additionsNames: [],
      totalCalories: 0,
      effectiveHydration: 250,
      displayName: 'رشفة سريعة (+250 مل)'
    };
  },
  pinWater(preset: CustomDrinkPreset): void {
    const list = this.getPinnedWaterList();
    const existingIndex = list.findIndex(item => item.displayName === preset.displayName);
    if (existingIndex > -1) {
      list[existingIndex] = preset;
    } else {
      list.unshift(preset);
    }
    setLocalItem('water_quick_pins_list', list);
    setLocalItem('water_quick_pin', preset); // Fallback single item
  },
  unpinWater(displayName: string): void {
    let list = this.getPinnedWaterList();
    list = list.filter(item => item.displayName !== displayName);
    if (list.length === 0) {
      list = [{
        beverageName: 'ماء نقي بارد 🥛',
        ml: 250,
        sugarTypeName: 'بدون سكر ❌',
        sugarSpoons: 0,
        additionsNames: [],
        totalCalories: 0,
        effectiveHydration: 250,
        displayName: 'ماء نقي بارد 🥛'
      }];
    }
    setLocalItem('water_quick_pins_list', list);
    setLocalItem('water_quick_pin', list[0]); // Update single fallback
  },

  // Pinning Quick Diet Button
  getPinnedDietList(): CustomDietPreset[] {
    const list = getLocalItem<CustomDietPreset[]>('diet_quick_pins_list', []);
    if (list.length === 0) {
      const legacy = localStorage.getItem('diet_quick_pin');
      const defaultItem: CustomDietPreset = legacy ? JSON.parse(legacy) : {
        foodBaseName: 'بيض مسلوق بلدي 🥚',
        qty: 2,
        additionsNames: [],
        totalCalories: 140,
        totalProtein: 12,
        totalCarbs: 1.2,
        totalFats: 10,
        displayName: 'بيضتان مسلوقتان 🥚'
      };
      const initial = [
        defaultItem,
        {
          foodBaseName: 'صدور دجاج مشوية 🍗',
          qty: 150,
          additionsNames: ['زيت زيتون بكر ممتاز 🫒'],
          totalCalories: 210,
          totalProtein: 31,
          totalCarbs: 0,
          totalFats: 8.6,
          displayName: 'صدور دجاج بالزيت الدافئ 🍗'
        },
        {
          foodBaseName: 'جبنة قريش لايت 🧀',
          qty: 150,
          additionsNames: ['شرائح خيار طازجة 🥒'],
          totalCalories: 88,
          totalProtein: 11.2,
          totalCarbs: 4.5,
          totalFats: 2.1,
          displayName: 'قريش بالخيار المنعش 🧀'
        }
      ];
      setLocalItem('diet_quick_pins_list', initial);
      return initial;
    }
    return list;
  },
  getPinnedDiet(): CustomDietPreset {
    const list = this.getPinnedDietList();
    return list[0] || {
      foodBaseName: 'بيض مسلوق بلدي 🥚',
      qty: 2,
      additionsNames: [],
      totalCalories: 140,
      totalProtein: 12,
      totalCarbs: 1.2,
      totalFats: 10,
      displayName: 'بيضتان مسلوقتان 🥚'
    };
  },
  pinDiet(preset: CustomDietPreset): void {
    const list = this.getPinnedDietList();
    const existingIndex = list.findIndex(item => item.displayName === preset.displayName);
    if (existingIndex > -1) {
      list[existingIndex] = preset;
    } else {
      list.unshift(preset);
    }
    setLocalItem('diet_quick_pins_list', list);
    setLocalItem('diet_quick_pin', preset); // Fallback
  },
  unpinDiet(displayName: string): void {
    let list = this.getPinnedDietList();
    list = list.filter(item => item.displayName !== displayName);
    if (list.length === 0) {
      list = [{
        foodBaseName: 'بيض مسلوق بلدي 🥚',
        qty: 2,
        additionsNames: [],
        totalCalories: 140,
        totalProtein: 12,
        totalCarbs: 1.2,
        totalFats: 10,
        displayName: 'بيضتان مسلوقتان 🥚'
      }];
    }
    setLocalItem('diet_quick_pins_list', list);
    setLocalItem('diet_quick_pin', list[0]); // Update fallback
  }
};

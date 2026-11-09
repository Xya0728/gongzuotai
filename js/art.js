'use strict';

/* =========================================================
   内置插画库：健身器械 / 食物
   纯 SVG，不联网、不依赖图片文件
   ========================================================= */

const EQUIPMENT_OPTIONS = [
  { value: 'barbell', label: '杠铃' },
  { value: 'dumbbell', label: '哑铃' },
  { value: 'kettlebell', label: '壶铃' },
  { value: 'cable', label: '龙门架' },
  { value: 'machine', label: '固定器械' },
  { value: 'treadmill', label: '跑步机' },
  { value: 'bike', label: '单车' },
  { value: 'bodyweight', label: '自重' },
];

const FOOD_CATEGORIES = ['蛋奶', '主食', '肉类', '蔬菜', '水果', '饮品', '其他'];

const ART_SHAPES = {
  barbell:
    '<rect x="14" y="30" width="36" height="4" rx="2" fill="#64748b"/>' +
    '<rect x="9" y="22" width="6" height="20" rx="2" fill="#334155"/>' +
    '<rect x="49" y="22" width="6" height="20" rx="2" fill="#334155"/>' +
    '<rect x="18" y="26" width="4" height="12" rx="1.5" fill="#475569"/>' +
    '<rect x="42" y="26" width="4" height="12" rx="1.5" fill="#475569"/>',

  dumbbell:
    '<rect x="24" y="30" width="16" height="5" rx="2.5" fill="#64748b"/>' +
    '<rect x="15" y="23" width="7" height="19" rx="2.5" fill="#334155"/>' +
    '<rect x="42" y="23" width="7" height="19" rx="2.5" fill="#334155"/>' +
    '<rect x="22" y="27" width="3" height="11" rx="1.5" fill="#475569"/>' +
    '<rect x="39" y="27" width="3" height="11" rx="1.5" fill="#475569"/>',

  kettlebell:
    '<path d="M24 21a8 8 0 0 1 16 0" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="32" cy="39" r="14" fill="#334155"/>' +
    '<ellipse cx="26" cy="34" rx="5" ry="4" fill="#475569" opacity=".55"/>',

  cable:
    '<rect x="11" y="8" width="43" height="4" rx="2" fill="#475569"/>' +
    '<rect x="11" y="8" width="4" height="48" rx="2" fill="#475569"/>' +
    '<circle cx="46" cy="16" r="4.5" fill="#94a3b8"/>' +
    '<path d="M46 21v12" stroke="#94a3b8" stroke-width="2.5"/>' +
    '<rect x="41" y="33" width="10" height="4" rx="2" fill="#334155"/>' +
    '<rect x="43" y="37" width="6" height="10" rx="3" fill="#334155"/>',

  machine:
    '<rect x="9" y="48" width="46" height="5" rx="2.5" fill="#475569"/>' +
    '<rect x="15" y="18" width="5" height="30" rx="2.5" fill="#334155"/>' +
    '<rect x="15" y="18" width="30" height="5" rx="2.5" fill="#334155"/>' +
    '<rect x="40" y="23" width="5" height="12" rx="2.5" fill="#64748b"/>' +
    '<circle cx="42.5" cy="38" r="4" fill="#94a3b8"/>' +
    '<rect x="26" y="40" width="14" height="5" rx="2.5" fill="#64748b"/>',

  treadmill:
    '<rect x="8" y="38" width="48" height="11" rx="5.5" fill="#334155"/>' +
    '<rect x="12" y="41" width="40" height="3" rx="1.5" fill="#64748b"/>' +
    '<rect x="38" y="14" width="14" height="18" rx="3" fill="#64748b"/>' +
    '<rect x="41" y="18" width="8" height="6" rx="1.5" fill="#cbd5e1"/>' +
    '<path d="M38 26 20 38" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>',

  bike:
    '<circle cx="19" cy="44" r="9" fill="none" stroke="#334155" stroke-width="4"/>' +
    '<circle cx="45" cy="44" r="9" fill="none" stroke="#334155" stroke-width="4"/>' +
    '<path d="M19 44 30 26h12L45 44M30 26 36 44" fill="none" stroke="#475569" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M28 24h8" stroke="#334155" stroke-width="4" stroke-linecap="round"/>',

  bodyweight:
    '<circle cx="32" cy="15" r="6" fill="#334155"/>' +
    '<path d="M32 22v15M18 27l14 3 14-3M32 37l-9 14M32 37l9 14" fill="none" stroke="#334155" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>',

  egg:
    '<path d="M18 36c-4-8 1-16 9-18s13 2 14 8c1 5-1 9-5 12-6 4-15 4-18-2z" fill="#f8fafc"/>' +
    '<circle cx="30" cy="29" r="7" fill="#f5b53f"/>' +
    '<circle cx="28" cy="27" r="2.2" fill="#fde68a" opacity=".85"/>',

  milk:
    '<path d="M22 20h20v30a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3z" fill="#eaf2ff"/>' +
    '<path d="M22 20l5-7h10l5 7z" fill="#cfe0fb"/>' +
    '<path d="M22 31h20v9H22z" fill="#93b7e8"/>' +
    '<path d="M28 13v-3h8v3" stroke="#93b7e8" stroke-width="2.5" stroke-linecap="round"/>',

  rice:
    '<path d="M14 33h36c0 9-8 17-18 17S14 42 14 33z" fill="#f8fafc"/>' +
    '<path d="M18 33c2-8 8-11 14-11s12 3 14 11z" fill="#f1f5f9"/>' +
    '<path d="M14 33h36" stroke="#cbd5e1" stroke-width="2.5"/>' +
    '<path d="M12 52h40" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>',

  meat:
    '<path d="M16 24c6-8 20-9 27-2s6 18-3 23c-8 5-20 2-24-5-3-6-3-11 0-16z" fill="#c2410c"/>' +
    '<path d="M22 27c4-4 12-4 16 0" stroke="#ea8a5c" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="41" cy="40" r="6" fill="#f8fafc"/>',

  veg:
    '<rect x="28" y="34" width="8" height="17" rx="3" fill="#86efac"/>' +
    '<circle cx="24" cy="27" r="8" fill="#16a34a"/>' +
    '<circle cx="40" cy="27" r="8" fill="#15803d"/>' +
    '<circle cx="32" cy="20" r="8" fill="#22c55e"/>' +
    '<circle cx="32" cy="28" r="8" fill="#16a34a"/>',

  fruit:
    '<circle cx="32" cy="37" r="14" fill="#ef4444"/>' +
    '<path d="M32 23c0-5 3-8 8-9-1 6-4 9-8 9z" fill="#22c55e"/>' +
    '<path d="M32 23v-6" stroke="#65a30d" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="26" cy="33" r="3" fill="#fca5a5" opacity=".7"/>',

  drink:
    '<path d="M19 18h26l-3 32a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z" fill="#e0f2fe"/>' +
    '<path d="M19 18h26l-1 10H20z" fill="#7dd3fc"/>' +
    '<path d="M36 18l4-9" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="24" y="34" width="16" height="3" rx="1.5" fill="#bae6fd"/>',

  other:
    '<circle cx="32" cy="34" r="17" fill="#f8fafc"/>' +
    '<circle cx="32" cy="34" r="11" fill="none" stroke="#cbd5e1" stroke-width="2.5"/>' +
    '<path d="M12 20v10M9 20v6M15 20v6M12 30v14" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M52 20v24" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>',
};

const FOOD_KEYWORDS = [
  { keys: ['蛋'], category: '蛋奶', art: 'egg' },
  { keys: ['奶', '酸奶', '芝士', '奶酪'], category: '蛋奶', art: 'milk' },
  { keys: ['咖啡', '茶', '汁', '水', '可乐', '啤酒', '豆浆'], category: '饮品', art: 'drink' },
  { keys: ['饭', '面', '粥', '包', '燕麦', '馒头', '饺', '粉', '饼', '红薯', '玉米'], category: '主食', art: 'rice' },
  { keys: ['鸡', '牛', '猪', '羊', '鱼', '虾', '肉', '肠', '培根', '三文鱼'], category: '肉类', art: 'meat' },
  { keys: ['菜', '西兰花', '番茄', '黄瓜', '菠菜', '生菜', '蘑菇', '萝卜'], category: '蔬菜', art: 'veg' },
  { keys: ['苹果', '香蕉', '橙', '梨', '莓', '葡萄', '西瓜', '桃', '水果'], category: '水果', art: 'fruit' },
];

function artSVG(shape, label) {
  return (
    '<svg class="art" viewBox="0 0 64 64" role="img" aria-label="' + esc(label || '') + '">' +
    (ART_SHAPES[shape] || ART_SHAPES.other) +
    '</svg>'
  );
}

function equipmentArt(key) {
  const found = EQUIPMENT_OPTIONS.find((item) => item.value === key);
  return artSVG(key || 'bodyweight', found ? found.label : '器械');
}

function equipmentLabel(key) {
  const found = EQUIPMENT_OPTIONS.find((item) => item.value === key);
  return found ? found.label : '';
}

function foodCategoryOf(name, category) {
  if (category && FOOD_CATEGORIES.indexOf(category) >= 0) return category;
  const text = String(name || '');
  for (let i = 0; i < FOOD_KEYWORDS.length; i++) {
    const group = FOOD_KEYWORDS[i];
    for (let j = 0; j < group.keys.length; j++) {
      if (text.indexOf(group.keys[j]) >= 0) return group.category;
    }
  }
  return '其他';
}

function foodArt(name, category) {
  const text = String(name || '');
  let shape = 'other';
  for (let i = 0; i < FOOD_KEYWORDS.length; i++) {
    const group = FOOD_KEYWORDS[i];
    for (let j = 0; j < group.keys.length; j++) {
      if (text.indexOf(group.keys[j]) >= 0) {
        shape = group.art;
        break;
      }
    }
    if (shape !== 'other') break;
  }
  if (shape === 'other') {
    const cat = foodCategoryOf(text, category);
    shape = { 蛋奶: 'egg', 主食: 'rice', 肉类: 'meat', 蔬菜: 'veg', 水果: 'fruit', 饮品: 'drink' }[cat] || 'other';
  }
  return artSVG(shape, name || '食物');
}

with open('src/types/index.ts', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''  latitude?: number;
  longitude?: number;
  locationName?: string; // e.g. "Vaishali Nagar, Ajmer"
}'''

replacement = '''  latitude?: number;
  longitude?: number;
  locationName?: string; // e.g. "Vaishali Nagar, Ajmer"
  distance?: number; // Distance from shopkeeper in km
}'''

code = code.replace(target, replacement)

with open('src/types/index.ts', 'w', encoding='utf-8') as f:
    f.write(code)

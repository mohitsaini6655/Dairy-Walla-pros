import re

path = 'src/utils/invoicePdf.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('`₹${', '`Rs. ${')
content = content.replace("formatItemRate(item.unitPrice, item.unit),", "formatItemRate(item.unitPrice, item.unit).replace('₹', 'Rs. '),")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("PDF patched successfully")

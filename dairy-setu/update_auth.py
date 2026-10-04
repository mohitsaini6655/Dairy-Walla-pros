import os

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update authStore.ts
auth_replacements = [
    ("signIn: (phone: string, _uid: string, role: Role) => Promise<{ error?: string; user?: User; needsProfile?: boolean }>;", 
     "signIn: (email: string, role: Role) => Promise<{ error?: string; user?: User; needsProfile?: boolean }>;"),
    ("const fetchAndSetUser = async (phone: string, resFn: () => void) => {", 
     "const fetchAndSetUser = async (email: string, resFn: () => void) => {"),
    ("const res = await axios.post(`${API_URL}/auth/me`, { phone, role: preferredRole });", 
     "const res = await axios.post(`${API_URL}/auth/me`, { email, role: preferredRole });"),
    ("const localPhone = localStorage.getItem('dairy-walla-phone');", 
     "const localEmail = localStorage.getItem('dairy-walla-email');"),
    ("if (localPhone) {", "if (localEmail) {"),
    ("fetchAndSetUser(localPhone, resolve)", "fetchAndSetUser(localEmail, resolve)"),
    ("localStorage.removeItem('dairy-walla-phone');", "localStorage.removeItem('dairy-walla-email');"),
    ("if (!firebaseUser || !firebaseUser.phoneNumber) {", "if (!firebaseUser || !firebaseUser.email) {"),
    ("const phone = firebaseUser.phoneNumber.replace('+91', '');", "const email = firebaseUser.email;"),
    ("localStorage.setItem('dairy-walla-phone', phone);", "localStorage.setItem('dairy-walla-email', email);"),
    ("await fetchAndSetUser(phone, resolve);", "await fetchAndSetUser(email, resolve);"),
    ("signIn: async (phone, _uid, role) => {", "signIn: async (email, role) => {"),
    ("const res = await axios.post(`${API_URL}/auth/me`, { phone, role });", 
     "const res = await axios.post(`${API_URL}/auth/me`, { email, role });"),
    ("localStorage.setItem('dairy-walla-phone', phone);", "localStorage.setItem('dairy-walla-email', email);"),
    ("localStorage.removeItem('dairy-walla-phone');", "localStorage.removeItem('dairy-walla-email');")
]
update_file('src/store/authStore.ts', auth_replacements)

# Update server.ts
server_replacements = [
    ('''app.post('/api/auth/me', async (req, res) => {
  const { phone, role } = req.body; // Role added to check for conflicts
  try {
    let profile = await prisma.profile.findFirst({ where: { phone } });
    if (!profile) {
      return res.json({ needsSetup: true });
    }

    // CRITICAL: Check if user is trying to log in with a different role
    if (role && profile.role !== role) {
      return res.status(409).json({ 
        error: `This number is already registered as a ${profile.role}. Please log in with the correct role.` 
      });
    }''',
     '''app.post('/api/auth/me', async (req, res) => {
  const { email, role } = req.body;
  try {
    let profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      return res.json({ needsSetup: true });
    }

    if (role && profile.role !== role) {
      return res.status(409).json({ 
        error: `This email is already registered as a ${profile.role}. Please log in with the correct role.` 
      });
    }'''),
    ('''app.post('/api/auth/setup', async (req, res) => {
  const { phone, role, name, businessData, shopData, pin } = req.body;
  try {
    let profile = await prisma.profile.findFirst({ where: { phone } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: { phone, role, name, pin, email: `${phone}@dairy.local` }
      });
    } else {
      if (profile.role !== role) {
        return res.status(409).json({ error: `Cannot change role. This number is already registered as a ${profile.role}.` });
      }
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: { name, pin }
      });
    }''',
     '''app.post('/api/auth/setup', async (req, res) => {
  const { email, phone, role, name, businessData, shopData, pin } = req.body;
  try {
    let profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      profile = await prisma.profile.create({
        data: { email, phone, role, name, pin }
      });
    } else {
      if (profile.role !== role) {
        return res.status(409).json({ error: `Cannot change role. This account is already registered as a ${profile.role}.` });
      }
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: { name, phone, pin }
      });
    }''')
]
update_file('server.ts', server_replacements)

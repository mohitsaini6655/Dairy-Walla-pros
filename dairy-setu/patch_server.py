import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

bad_snippet = """  } catch {
    return res.status(500).json({ error: 'Server error' });
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        results = results
          .map((dp) => {
            let distance: number | null = null;
            if (dp.latitude !== null && dp.latitude !== undefined && dp.longitude !== null && dp.longitude !== undefined) {
              distance = getDistanceFromLatLonInKm(userLat, userLng, dp.latitude, dp.longitude);
            }
            return { ...dp, distance };
          })
          .sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
      }
    }

    return res.json(results);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});"""

good_snippet = """  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/distributors', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const dps = await prisma.distributorProfile.findMany({ 
      where: { profileComplete: true },
      include: { user: true } 
    });
    let results: any[] = dps.map((dp) => ({ ...dp, phone: dp.user.phone, email: dp.user.email }));

    if (lat !== undefined && lng !== undefined) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        results = results
          .map((dp) => {
            let distance: number | null = null;
            if (dp.latitude !== null && dp.latitude !== undefined && dp.longitude !== null && dp.longitude !== undefined) {
              distance = getDistanceFromLatLonInKm(userLat, userLng, dp.latitude, dp.longitude);
            }
            return { ...dp, distance };
          })
          .sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
      }
    }

    return res.json(results);
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});"""

content = content.replace(bad_snippet, good_snippet)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

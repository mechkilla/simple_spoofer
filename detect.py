import asyncio
from pymobiledevice3.lockdown import create_using_usbmux

async def detecter_iphone():
    try:
        # Le mot 'await' dit à Python : "Patiente jusqu'à ce que l'iPhone réponde"
        lockdown = await create_using_usbmux()
        
        # On récupère les infos de l'appareil
        nom = lockdown.short_info.get('DeviceName', 'Inconnu')
        version = lockdown.short_info.get('ProductVersion', 'Inconnue')
        
        print("✅ Appareil détecté sur le port USB !")
        print(f"📱 Nom de l'iPhone : {nom}")
        print(f"⚙️ Version iOS : {version}")
        print("🎉 Connexion 100% réussie ! Le PC a accès à l'iPhone.")
        
    except Exception as e:
        print("❌ Erreur : Impossible de lire les infos de l'iPhone.")
        print(f"Détail technique : {e}")
        print("-> As-tu bien branché le câble, déverrouillé l'écran et cliqué sur 'Faire confiance' ?")

if __name__ == "__main__":
    print("Recherche d'un iPhone en cours...")
    # On lance notre fonction avec asyncio pour gérer l'attente correctement
    asyncio.run(detecter_iphone())
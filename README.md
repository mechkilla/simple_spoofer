# 🛸 SIMPLE SPOOFER - by French-Studio

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Plateforme](https://img.shields.io/badge/plateforme-Windows-lightgrey.svg)
![Licence](https://img.shields.io/badge/licence-MIT-green.svg)

![iPhone](https://img.shields.io/badge/Compatible-iPhone_%26_iPad-black?logo=apple)
![iOS](https://img.shields.io/badge/iOS-14_à_17+-blue?logo=apple)
![No Jailbreak](https://img.shields.io/badge/Jailbreak-Non_Requis-success)

**Simple Spoofer** est un outil de modification GPS (Spoofing) premium et open-source pour les appareils iOS (iPhone/iPad). Développé par **French-Studio**, il permet de modifier la position GPS de votre appareil en temps réel, sans jailbreak, via une interface moderne, fluide et intuitive.

Idéal pour tester vos applications basées sur la géolocalisation, protéger votre vie privée, ou jouer à des jeux nécessitant des déplacements réels.

---

## ✨ Fonctionnalités Principales

* **📍 Mode Classique (Téléportation)** : Un clic sur la carte suffit pour téléporter instantanément votre appareil n'importe où dans le monde.
* **🛣️ Mode Trajet Intelligent (IA)** : Placez un point de départ (A) et un point d'arrivée (B). Le logiciel calcule l'itinéraire sur les **vraies routes** et déplace votre personnage automatiquement de manière réaliste.
* **🕹️ Mode Joystick** : Prenez le contrôle total ! Utilisez les touches `Z, Q, S, D` ou les `Flèches directionnelles` de votre clavier pour vous déplacer mètre par mètre en temps réel.
* **⚡ Vitesse Dynamique** : Une jauge précise vous permet d'ajuster votre vitesse de 1 km/h (marche lente) à 150 km/h (autoroute).
* **⭐ Gestionnaire de Favoris** : Sauvegardez vos lieux préférés pour vous y téléporter en un clic lors de vos prochaines sessions.
* **🔄 Mises à jour OTA** : Le logiciel interroge automatiquement GitHub pour vous prévenir si une nouvelle version est disponible.

---

## ⚠️ Prérequis

Avant d'utiliser Simple Spoofer, assurez-vous d'avoir les éléments suivants installés sur votre PC Windows :

1. **[Python 3.x](https://www.python.org/downloads/)** (Assurez-vous de cocher "Add Python to PATH" lors de l'installation).
2. **Le module Python `pymobiledevice3`** : 
   Ouvrez une invite de commande et tapez : `pip install pymobiledevice3`
3. **iTunes** (ou l'application Appareils Apple) installé pour que Windows possède les pilotes USB Apple.
4. **Mode Développeur activé sur l'iPhone** :
   * Allez dans *Réglages > Confidentialité et sécurité > Mode développeur*.
   * Activez-le et redémarrez votre iPhone.

---

## 🚀 Installation & Lancement

### Option A : Télécharger la version compilée (.exe)
1. Rendez-vous dans l'onglet **[Releases](../../releases)** de ce dépôt GitHub.
2. Téléchargez le dernier fichier `SIMPLE SPOOFER Setup X.X.X.exe`.
3. Installez-le et lancez-le !

### Option B : Lancer depuis le code source (Pour les développeurs)
1. Clonez ce dépôt :
   ```bash
   git clone [https://github.com/mechkilla/simple_spoofer.git](https://github.com/mechkilla/simple_spoofer.git)

   Rendez-vous dans le dossier :
   
- ```cd simple_spoofer```
- ```npm install```
-``` npm start```

---

### 🎮 Comment l'utiliser ?
Branchez votre iPhone à votre PC via un câble USB de bonne qualité.

Déverrouillez votre écran d'iPhone (Gardez-le allumé).

Ouvrez Simple Spoofer (en mode Administrateur de préférence).

Cliquez sur le bouton bleu "🔌 Connecter l'iPhone".

Une fois le terminal vert et l'appareil connecté, choisissez votre mode de déplacement (Classique, Trajet, ou Joystick) et profitez !

(Note : Pour restaurer votre vrai GPS, cliquez sur le bouton rouge "Retour à la réalité" ou redémarrez simplement votre iPhone).

🛑 Avertissement & Légalité
Simple Spoofer est un outil conçu à des fins éducatives, de test de développement, et de protection de la vie privée.

L'utilisation de cet outil pour tricher dans des jeux vidéo (Pokémon GO, Monster Hunter, etc.) enfreint les conditions d'utilisation de ces jeux et peut entraîner le bannissement définitif de votre compte.

French-Studio décline toute responsabilité quant à l'utilisation qui est faite de ce logiciel et des éventuelles sanctions appliquées par des applications tierces. Utilisez-le à vos propres risques.

---

👨‍💻 Crédits
Développé avec ❤️ par French-Studio.fr
Propulsé par Electron, Leaflet, et pymobiledevice3.

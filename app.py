import customtkinter
import tkintermapview
import geocoder
import subprocess
import threading
import re
import time
import math

# --- CONFIGURATION DU DESIGN ---
customtkinter.set_appearance_mode("Dark")
customtkinter.set_default_color_theme("blue")

class SimpleSpooferApp(customtkinter.CTk):
    def __init__(self):
        super().__init__()

        self.title("SIMPLE SPOOFER v3.1 - by French-Studio 🚀")
        self.geometry("1150x750")
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

        # Variables internes du Moteur
        self.tunneld_process = None
        self.iphone_ip = None
        self.iphone_port = None
        self.is_connected = False
        
        self.cmd_lock = threading.Lock() # Le Verrou Anti-Crash
        
        # Variables de Trajet
        self.is_routing = False 
        self.current_lat = 43.4385 # Fos-sur-Mer
        self.current_lon = 4.9451
        self.history = []
        self.favorites = []
        self.route_path = None

        # --- LAYOUT PRINCIPAL ---
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # --- BARRE LATÉRALE (Sidebar) ---
        self.sidebar = customtkinter.CTkFrame(self, width=280, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(6, weight=1)

        self.logo_label = customtkinter.CTkLabel(self.sidebar, text="SIMPLE SPOOFER", font=customtkinter.CTkFont(size=22, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 5))
        self.company_label = customtkinter.CTkLabel(self.sidebar, text="© French-Studio", text_color="#3498db", font=customtkinter.CTkFont(size=12, weight="bold"))
        self.company_label.grid(row=1, column=0, padx=20, pady=(0, 20))

        # Zone de Connexion
        self.conn_frame = customtkinter.CTkFrame(self.sidebar)
        self.conn_frame.grid(row=2, column=0, padx=10, pady=10, sticky="ew")

        self.btn_connect = customtkinter.CTkButton(self.conn_frame, text="🔌 Connecter l'iPhone", command=self.auto_connect, fg_color="#2ecc71", hover_color="#27ae60")
        self.btn_connect.pack(fill="x", padx=10, pady=10)
        self.status_icon = customtkinter.CTkLabel(self.conn_frame, text="⚪ Déconnecté", text_color="gray")
        self.status_icon.pack(pady=5)

        # Zone Contrôles (Vitesse, Trajet & Reset)
        self.controls_frame = customtkinter.CTkFrame(self.sidebar)
        
        self.lbl_speed = customtkinter.CTkLabel(self.controls_frame, text="⚙️ Vitesse de déplacement :", text_color="white")
        self.lbl_speed.pack(pady=(10, 0))
        
        self.speed_var = customtkinter.StringVar(value="🚶 Marche (5 km/h)")
        self.speed_menu = customtkinter.CTkOptionMenu(
            self.controls_frame, 
            values=["🚶 Marche (5 km/h)", "🚴 Vélo (15 km/h)", "🚗 Voiture (50 km/h)", "✈️ Fusée (150 km/h)"],
            variable=self.speed_var
        )
        self.speed_menu.pack(fill="x", padx=10, pady=(5, 15))

        self.btn_stop_route = customtkinter.CTkButton(self.controls_frame, text="🛑 Stopper le Trajet", command=self.stop_route, fg_color="#f39c12", hover_color="#d68910", state="disabled")
        self.btn_stop_route.pack(fill="x", padx=10, pady=(0, 10))

        self.btn_reset = customtkinter.CTkButton(self.controls_frame, text="🏠 Retour à Fos-sur-Mer", command=self.reset_location, fg_color="#e74c3c", hover_color="#c0392b")
        self.btn_reset.pack(fill="x", padx=10, pady=(0, 10))

        # Onglets Historique / Favoris
        self.tabview = customtkinter.CTkTabview(self.sidebar, height=250)
        self.tabview.grid(row=5, column=0, padx=10, pady=10, sticky="ew")
        self.tabview.add("Favoris")
        self.tabview.add("Historique")
        
        self.fav_scroll = customtkinter.CTkScrollableFrame(self.tabview.tab("Favoris"))
        self.fav_scroll.pack(fill="both", expand=True)
        self.history_scroll = customtkinter.CTkScrollableFrame(self.tabview.tab("Historique"))
        self.history_scroll.pack(fill="both", expand=True)
        
        self.btn_fav = customtkinter.CTkButton(self.tabview.tab("Favoris"), text="⭐ Ajouter la position", command=self.add_favorite)
        self.btn_fav.pack(fill="x", pady=(5,0))

        # --- ZONE CARTE ET RECHERCHE ---
        self.main_frame = customtkinter.CTkFrame(self)
        self.main_frame.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")

        self.search_entry = customtkinter.CTkEntry(self.main_frame, placeholder_text="🔍 Chercher une ville, adresse...", height=40)
        self.search_entry.pack(fill="x", pady=(0, 10))
        self.search_entry.bind("<Return>", self.search_event)

        self.map_widget = tkintermapview.TkinterMapView(self.main_frame, corner_radius=10)
        self.map_widget.pack(fill="both", expand=True)
        self.map_widget.set_position(self.current_lat, self.current_lon) 
        self.map_widget.set_zoom(13)
        
        self.map_widget.add_right_click_menu_command(label="🛸 Se téléporter ici", command=self.teleport_event, pass_coords=True)
        self.map_widget.add_right_click_menu_command(label="🚶‍♂️ Se rendre ici (Vitesse sélectionnée)", command=self.start_route_event, pass_coords=True)

        # BINDINGS JOYSTICK
        self.bind("<Up>", lambda event: self.move_joystick(0.00005, 0))    
        self.bind("<Down>", lambda event: self.move_joystick(-0.00005, 0)) 
        self.bind("<Left>", lambda event: self.move_joystick(0, -0.00005)) 
        self.bind("<Right>", lambda event: self.move_joystick(0, 0.00005)) 

    # --- MOTEUR DE CONNEXION ---
    def auto_connect(self):
        self.btn_connect.configure(state="disabled", text="⏳ Analyse USB...")
        self.status_icon.configure(text="⚙️ Démarrage du moteur...", text_color="yellow")
        threading.Thread(target=self._connect_thread, daemon=True).start()

    def _connect_thread(self):
        try:
            self.tunneld_process = subprocess.Popen("python -m pymobiledevice3 remote tunneld", shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in iter(self.tunneld_process.stdout.readline, ''):
                match = re.search(r'--rsd\s+([a-fA-F0-9:]+)\s+(\d+)', line)
                if match:
                    self.iphone_ip = match.group(1)
                    self.iphone_port = match.group(2)
                    break 

            if self.iphone_ip:
                subprocess.run(f"python -m pymobiledevice3 mounter auto-mount --rsd {self.iphone_ip} {self.iphone_port}", shell=True)
                self.after(0, self.on_connected)
            else:
                self.after(0, lambda: self.status_icon.configure(text="❌ Tunnel introuvable", text_color="red"))
        except Exception:
            self.after(0, lambda: self.btn_connect.configure(state="normal", text="🔌 Réessayer"))

    def on_connected(self):
        self.is_connected = True
        self.btn_connect.pack_forget()
        self.status_icon.configure(text=f"🟢 Connecté (Port: {self.iphone_port})", text_color="#2ecc71")
        self.controls_frame.grid(row=3, column=0, padx=10, pady=10, sticky="ew")

    def search_event(self, event=None):
        query = self.search_entry.get()
        if query:
            g = geocoder.osm(query)
            if g.ok:
                lat, lon = g.latlng
                self.map_widget.set_position(lat, lon)
                self.map_widget.set_zoom(15)

    def teleport_event(self, coords, save_history=True):
        if not self.is_connected: return
        self.stop_route()
        self.current_lat, self.current_lon = coords
        self.update_map_marker("📍 Position Spoofer")
        if save_history: self.add_history(self.current_lat, self.current_lon)
        self.status_icon.configure(text="🚀 Saut spatial...", text_color="yellow")
        threading.Thread(target=self._send_dvt_command, args=(self.current_lat, self.current_lon, True)).start()

    def calculate_distance_km(self, lat1, lon1, lat2, lon2):
        R = 6371.0 
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    # --- 🚶‍♂️ NOUVEAU MOTEUR DE TRAJET FLUIDE (V3.1) ---
    def start_route_event(self, coords):
        if not self.is_connected: return
        self.stop_route()
        
        dest_lat, dest_lon = coords
        
        # Dessine la route
        self.route_path = self.map_widget.set_path([(self.current_lat, self.current_lon), (dest_lat, dest_lon)], color="#e74c3c", width=3)
        
        self.is_routing = True
        self.btn_stop_route.configure(state="normal")
        self.status_icon.configure(text="🛣️ Trajet en cours...", text_color="#3498db")
        
        threading.Thread(target=self._route_thread, args=(dest_lat, dest_lon), daemon=True).start()

    def _route_thread(self, dest_lat, dest_lon):
        start_lat, start_lon = self.current_lat, self.current_lon
        
        dist_km = self.calculate_distance_km(start_lat, start_lon, dest_lat, dest_lon)
        if dist_km < 0.0005: # Si on clique à moins de 50 centimètres, on arrête.
            self.after(0, self.stop_route)
            return 
            
        speed_str = self.speed_var.get()
        if "5" in speed_str: speed_kmh = 5.0
        elif "15" in speed_str: speed_kmh = 15.0
        elif "50" in speed_str: speed_kmh = 50.0
        else: speed_kmh = 150.0 
        
        time_hours = dist_km / speed_kmh
        time_seconds = time_hours * 3600
        
        # Mouvement fluide sur la carte : 10 images par seconde
        fps = 10.0
        total_frames = int(time_seconds * fps)
        if total_frames < 1: total_frames = 1
        
        d_lat = (dest_lat - start_lat) / total_frames
        d_lon = (dest_lon - start_lon) / total_frames
        
        last_iphone_update = 0
        
        for i in range(total_frames):
            if not self.is_routing: break
            
            self.current_lat += d_lat
            self.current_lon += d_lon
            
            # 1. On bouge le marqueur sur la carte (sans bloquer)
            self.after(0, self.update_map_marker, "🏃 En mouvement")
            
            # 2. On envoie au téléphone toutes les 3 secondes seulement !
            current_time = time.time()
            if current_time - last_iphone_update >= 3.0:
                last_iphone_update = current_time
                if not self.cmd_lock.locked():
                    threading.Thread(target=self._send_dvt_command, args=(self.current_lat, self.current_lon, False)).start()
            
            # Petite pause pour fluidifier le mouvement de la carte
            time.sleep(1.0 / fps)
            
        if self.is_routing:
            self.current_lat, self.current_lon = dest_lat, dest_lon
            self.after(0, self.update_map_marker, "📍 Arrivé")
            threading.Thread(target=self._send_dvt_command, args=(self.current_lat, self.current_lon, False)).start()
            self.after(0, self.stop_route)
            self.after(0, lambda: self.status_icon.configure(text="🟢 Arrivé à destination !", text_color="#2ecc71"))

    def stop_route(self):
        self.is_routing = False
        self.btn_stop_route.configure(state="disabled")
        self.map_widget.delete_all_path()

    def move_joystick(self, d_lat, d_lon):
        if not self.is_connected: return
        self.stop_route()
        self.current_lat += d_lat
        self.current_lon += d_lon
        self.update_map_marker("🕹️ Joystick")
        
        if not self.cmd_lock.locked():
            threading.Thread(target=self._send_dvt_command, args=(self.current_lat, self.current_lon, False)).start()

    def _send_dvt_command(self, lat, lon, is_teleport):
        with self.cmd_lock:
            cmd = f"python -m pymobiledevice3 developer dvt simulate-location set --rsd {self.iphone_ip} {self.iphone_port} {lat} {lon}"
            subprocess.run(cmd, shell=True)
            if is_teleport:
                self.after(0, lambda: self.status_icon.configure(text=f"🟢 Position fixée", text_color="#2ecc71"))

    def update_map_marker(self, text_label):
        # On évite que la carte saute de façon instable
        # self.map_widget.set_position(self.current_lat, self.current_lon) # Désactivé pour le mode libre
        self.map_widget.delete_all_marker()
        self.map_widget.set_marker(self.current_lat, self.current_lon, text=text_label)

    def add_history(self, lat, lon):
        name = f"{lat:.3f}, {lon:.3f}"
        btn = customtkinter.CTkButton(self.history_scroll, text=f"📍 {name}", fg_color="transparent", border_width=1, command=lambda: self.teleport_event((lat, lon), False))
        btn.pack(fill="x", pady=2)

    def add_favorite(self):
        name = self.search_entry.get() or f"Favori ({self.current_lat:.2f})"
        btn = customtkinter.CTkButton(self.fav_scroll, text=f"⭐ {name}", fg_color="transparent", text_color="yellow", border_width=1, command=lambda: self.teleport_event((self.current_lat, self.current_lon), False))
        btn.pack(fill="x", pady=2)
        self.favorites.append((self.current_lat, self.current_lon))

    def reset_location(self):
        if not self.is_connected: return
        self.stop_route()
        self.status_icon.configure(text="⏳ Retour en cours...", text_color="yellow")
        threading.Thread(target=self._run_reset_command).start()

    def _run_reset_command(self):
        with self.cmd_lock:
            cmd = f"python -m pymobiledevice3 developer dvt simulate-location clear --rsd {self.iphone_ip} {self.iphone_port}"
            subprocess.run(cmd, shell=True)
            self.after(0, self.on_reset_success)

    def on_reset_success(self):
        self.map_widget.delete_all_marker()
        self.status_icon.configure(text="🟢 GPS Réel Restauré", text_color="#2ecc71")

    def on_closing(self):
        if self.tunneld_process: self.tunneld_process.kill()
        self.destroy()

if __name__ == "__main__":
    app = SimpleSpooferApp()
    app.mainloop()
import requests
import time
import json
import random

BASE_URL = "http://localhost:8088"

def get_state():
    try:
        response = requests.get(f"{BASE_URL}/api/state")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching state: {e}")
        return None

def send_command(team, unit_type):
    try:
        payload = {"action": "queueManualTask", "team": team, "type": unit_type}
        response = requests.post(f"{BASE_URL}/api/command", json=payload)
        response.raise_for_status()
        print(f"Command Sent: Team {team} building {unit_type}")
        return response.json()
    except Exception as e:
        print(f"Error sending command: {e}")
        return None

def set_engine_speed(speed):
    try:
        payload = {"action": "speed", "value": speed}
        requests.post(f"{BASE_URL}/api/control", json=payload)
        print(f"Engine speed set to {speed}x")
    except Exception as e:
        print(f"Error changing speed: {e}")

def main():
    print("🤖 Agent Connected. Polling simulation state...")
    
    # Optional: Slow down the game to give the LLM time to 'think'
    set_engine_speed(0.2) # 1 real second = 0.2 simulated seconds
    
    # Simple reflex agent loop
    while True:
        state = get_state()
        if not state:
            time.sleep(2)
            continue
            
        print(f"\n--- Tick {state['tick']} ({state['elapsedSeconds']}s) ---")
        
        red = state['team0_Red']
        blue = state['team1_Blue']
        
        if state['gameOver']:
            print(f"Game Over! Winner: {state['winner']}")
            break
            
        print(f"🔴 Red Pop: {red['alive']}/{red['popCap']}")
        print(f"   Treasury: Food {int(red['resources']['food'])} | Wood {int(red['resources']['wood'])} | Gold {int(red['resources']['gold'])}")
        print(f"   Units: {json.dumps(red['unitCounts'])}")
        
        print(f"🔵 Blue Pop: {blue['alive']}/{blue['popCap']}")
        print(f"   Units: {json.dumps(blue['unitCounts'])}")
        
        # Super simple logic: If you have more than 100 wood, build a house to expand pop cap
        if red['resources']['wood'] >= 50 and red['alive'] >= red['popCap'] - 2 and 'House' not in red['queue']:
            print("🧮 Agent Decision: We need more population capacity. Building House.")
            send_command(0, "House")
            
        # If we have food and gold, build a knight
        elif red['resources']['food'] >= 100 and red['resources']['gold'] >= 20:
            print("🧮 Agent Decision: We can afford a Knight. Queuing Knight.")
            send_command(0, "Knight")
        
        # Occasionally build spearmen
        elif red['resources']['food'] >= 60 and red['resources']['wood'] >= 20:
             if random.random() < 0.3:
                 print("🧮 Agent Decision: Building Spearman for defense.")
                 send_command(0, "Spearman")
                 
        time.sleep(1.0) # Check state once a second

if __name__ == "__main__":
    main()

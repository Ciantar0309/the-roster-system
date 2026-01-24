# backend/solver/roster_api.py
import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

# Add backend/ to PYTHONPATH
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from routes.roster_solve import roster_solve_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(roster_solve_bp)

@app.get("/health")
def health():
    return jsonify({"status": "ok", "solver": "RosterPro v21.0"})

if __name__ == "__main__":
    print("🚀 Starting RosterPro Solver API on port 3002...")
    app.run(host="127.0.0.1", port=3002, debug=True)

import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS

# Add backend/ to PYTHONPATH so we can import backend/routes/...
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from routes.roster_solve import roster_solve_bp  # now this works

app = Flask(__name__)
CORS(app)

app.register_blueprint(roster_solve_bp)

@app.get("/health")
def health():
    return jsonify({"status": "ok", "solver": "RosterSolver via blueprint"})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=3002, debug=True)

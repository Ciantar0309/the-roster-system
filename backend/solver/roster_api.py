from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "version": "test"})

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "RosterPro Solver API", "status": "running"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3002))
    print(f"Starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)

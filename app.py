from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)
DATA_FILE = 'data.json'

def read_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'content': ''}

def write_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ✅ 主页路由
@app.route('/')
def index():
    return render_template('index.html')

# ✅ 保存 API (POST)
@app.route('/api/save', methods=['POST'])
def save():
    data = request.json
    content = data.get('content', '')
    write_data({'content': content})
    return jsonify({'success': True, 'message': '保存成功'})

# ✅ 读取 API (GET)
@app.route('/api/load', methods=['GET'])
def load():
    data = read_data()
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)

import os
import re
import json
import unicodedata
import secrets
from datetime import datetime, timedelta
from functools import wraps

import markdown
import requests as http_requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from flask import (Flask, render_template, request, redirect, url_for, flash,
                   jsonify, abort, Response, session, g)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///docs.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Security: session cookie settings
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

db = SQLAlchemy(app)

# ============================================================
#  CSRF Protection
# ============================================================

def generate_csrf_token():
    if '_csrf_token' not in session:
        session['_csrf_token'] = secrets.token_hex(32)
    return session['_csrf_token']

@app.before_request
def csrf_protect():
    if request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
        # Skip CSRF for API endpoints that use session auth differently
        endpoint = request.endpoint or ''
        if endpoint in ('submit_feedback',):
            return
        token = session.get('_csrf_token')
        form_token = request.form.get('_csrf_token')
        header_token = request.headers.get('X-CSRFToken') or request.headers.get('X-CSRF-Token')
        if not token or (token != form_token and token != header_token):
            abort(403, description='CSRF 검증에 실패했습니다.')

app.jinja_env.globals['csrf_token'] = generate_csrf_token

# ============================================================
#  Security Headers
# ============================================================

@app.after_request
def set_security_headers(resp):
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options'] = 'SAMEORIGIN'
    resp.headers['X-XSS-Protection'] = '1; mode=block'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    resp.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    return resp


# ============================================================
#  Models
# ============================================================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def verify(username, password):
        env_user = os.getenv('ADMIN_USERNAME')
        env_pass = os.getenv('ADMIN_PASSWORD')
        # Admin access stays closed when deployment credentials are missing.
        # A public fallback password would turn a forgotten .env into an account takeover.
        if not env_user or not env_pass:
            return None
        if username == env_user and password == env_pass:
            u = User.query.filter_by(username=username).first()
            if not u:
                u = User(username=username, password_hash=generate_password_hash(password))
                db.session.add(u)
                db.session.commit()
            return u
        return None


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    icon = db.Column(db.String(10), default='📄')
    sort_order = db.Column(db.Integer, default=0)
    docs = db.relationship('Doc', backref='category', lazy=True,
                           order_by='Doc.sort_order, Doc.title',
                           cascade='all, delete-orphan')

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'slug': self.slug,
                'icon': self.icon, 'sort_order': self.sort_order}


class Doc(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(250), unique=True, nullable=False)
    description = db.Column(db.String(300), default='')
    content = db.Column(db.Text, default='')
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    is_published = db.Column(db.Boolean, default=False)
    is_featured = db.Column(db.Boolean, default=False)
    views = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    versions = db.relationship('DocVersion', backref='doc', lazy=True,
                               order_by='DocVersion.created_at.desc()',
                               cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'description': self.description,
            'content': self.content,
            'category_id': self.category_id,
            'sort_order': self.sort_order,
            'is_published': self.is_published,
            'is_featured': self.is_featured,
            'views': self.views,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'category_name': self.category.name if self.category else None,
        }

    def prev_doc(self):
        return Doc.query.filter(
            Doc.is_published == True,
            Doc.id != self.id,
            db.or_(Doc.sort_order < self.sort_order,
                   db.and_(Doc.sort_order == self.sort_order, Doc.created_at < self.created_at))
        ).order_by(Doc.sort_order.desc(), Doc.created_at.desc()).first()

    def next_doc(self):
        return Doc.query.filter(
            Doc.is_published == True,
            Doc.id != self.id,
            db.or_(Doc.sort_order > self.sort_order,
                   db.and_(Doc.sort_order == self.sort_order, Doc.created_at > self.created_at))
        ).order_by(Doc.sort_order.asc(), Doc.created_at.asc()).first()


class DocVersion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    doc_id = db.Column(db.Integer, db.ForeignKey('doc.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, default='')
    message = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    doc_id = db.Column(db.Integer, db.ForeignKey('doc.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1=positive, -1=negative
    comment = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ============================================================
#  Auth
# ============================================================

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_user_id'):
            flash('로그인이 필요합니다.', 'error')
            return redirect(url_for('admin_login', next=request.url))
        return f(*args, **kwargs)
    return decorated

def current_admin():
    uid = session.get('admin_user_id')
    return User.query.get(uid) if uid else None


# ============================================================
#  Helpers
# ============================================================

def slugify(text):
    text = unicodedata.normalize('NFKD', text)
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text or 'untitled'

def ensure_unique_slug(model, slug, exclude_id=None):
    base = slug
    n = 1
    while True:
        q = model.query.filter_by(slug=slug)
        if exclude_id:
            q = q.filter(model.id != exclude_id)
        if not q.first():
            return slug
        slug = f'{base}-{n}'
        n += 1

def render_markdown(text):
    if not text:
        return ''
    html = markdown.markdown(
        text,
        extensions=['fenced_code', 'codehilite', 'tables', 'toc',
                     'nl2br', 'sane_lists', 'admonition'],
        extension_configs={
            'codehilite': {'css_class': 'highlight', 'guess_lang': True},
            'toc': {'permalink': True, 'toc_class': 'toc-nav'},
        }
    )
    # Post-process: add copy button to code blocks
    soup = BeautifulSoup(html, 'html.parser')
    for pre in soup.find_all('pre'):
        code = pre.find('code')
        if code:
            pre['class'] = pre.get('class', []) + ['code-block-wrapper']
            wrapper = soup.new_tag('div', **{'class': 'code-block'})
            pre.wrap(wrapper)
            btn = soup.new_tag('button', **{'class': 'copy-btn', 'onclick': 'copyCode(this)'})
            btn.string = '복사'
            wrapper.insert(0, btn)
    return str(soup)

def extract_toc(content):
    """Extract heading tree from markdown for sidebar TOC."""
    headings = []
    for line in content.split('\n'):
        m = re.match(r'^(#{1,4})\s+(.+)', line)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            anchor = slugify(text)
            headings.append({'level': level, 'text': text, 'anchor': anchor})
    return headings

def call_ai_api(messages, max_tokens=4000):
    api_url = os.getenv('AI_API_URL', 'https://api.teamwicked.me/v1') + '/chat/completions'
    api_key = os.getenv('TEAMWICKED_API_KEY')
    model = os.getenv('AI_MODEL', 'teamwicked-mimo')
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': model,
        'messages': messages,
        'max_tokens': max_tokens,
        'temperature': 0.7,
        'stream': False,
    }
    resp = http_requests.post(api_url, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']['content']

def save_version(doc, message=''):
    if doc.id:
        v = DocVersion(doc_id=doc.id, title=doc.title, content=doc.content, message=message)
        db.session.add(v)


# ============================================================
#  Context processor
# ============================================================

@app.context_processor
def inject_globals():
    return {
        'site_name': os.getenv('SITE_NAME', 'Wickedhost Docs'),
        'site_url': os.getenv('SITE_URL', ''),
    }


# ============================================================
#  Public routes
# ============================================================

@app.route('/')
def index():
    cats = Category.query.order_by(Category.sort_order, Category.name).all()
    first = Doc.query.filter_by(is_published=True).order_by(
        Doc.is_featured.desc(), Doc.sort_order, Doc.created_at.desc()).first()
    if first:
        return redirect(url_for('view_doc', slug=first.slug))
    return render_template('index.html', categories=cats, doc=None, toc=[], html_content='',
                           prev_doc=None, next_doc=None)

@app.route('/doc/<slug>')
def view_doc(slug):
    doc = Doc.query.filter_by(slug=slug, is_published=True).first_or_404()
    doc.views += 1
    db.session.commit()
    cats = Category.query.order_by(Category.sort_order, Category.name).all()
    html_content = render_markdown(doc.content)
    toc = extract_toc(doc.content)
    return render_template('index.html', categories=cats, doc=doc, toc=toc,
                           html_content=html_content, prev_doc=doc.prev_doc(),
                           next_doc=doc.next_doc())

@app.route('/search')
def search():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    results = Doc.query.filter(
        Doc.is_published == True,
        db.or_(Doc.title.contains(q), Doc.content.contains(q), Doc.description.contains(q))
    ).limit(20).all()
    return jsonify([{'title': d.title, 'slug': d.slug, 'description': d.description,
                     'category': d.category.name if d.category else ''} for d in results])

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    doc_id = data.get('doc_id')
    rating = data.get('rating')
    comment = data.get('comment', '')
    if doc_id and rating in (1, -1):
        fb = Feedback(doc_id=doc_id, rating=rating, comment=comment)
        db.session.add(fb)
        db.session.commit()
        return jsonify({'ok': True})
    return jsonify({'error': 'invalid'}), 400

@app.route('/sitemap.xml')
def sitemap():
    docs = Doc.query.filter_by(is_published=True).all()
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for d in docs:
        xml += f'  <url><loc>{url_for("view_doc", slug=d.slug, _external=True)}</loc></url>\n'
    xml += '</urlset>'
    return Response(xml, mimetype='application/xml')


# ============================================================
#  Admin auth
# ============================================================

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if session.get('admin_user_id'):
        return redirect(url_for('admin_dashboard'))
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        user = User.verify(username, password)
        if user:
            session['admin_user_id'] = user.id
            return redirect(request.args.get('next') or url_for('admin_dashboard'))
        flash('아이디 또는 비밀번호가 올바르지 않습니다.', 'error')
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_user_id', None)
    return redirect(url_for('admin_login'))


# ============================================================
#  Admin dashboard
# ============================================================

@app.route('/admin')
@login_required
def admin_dashboard():
    docs = Doc.query.order_by(Doc.category_id, Doc.sort_order, Doc.created_at.desc()).all()
    cats = Category.query.order_by(Category.sort_order).all()
    stats = {
        'total_docs': len(docs),
        'published': sum(1 for d in docs if d.is_published),
        'drafts': sum(1 for d in docs if not d.is_published),
        'total_views': sum(d.views for d in docs),
        'total_feedback': Feedback.query.count(),
        'positive': Feedback.query.filter_by(rating=1).count(),
        'negative': Feedback.query.filter_by(rating=-1).count(),
    }
    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).limit(10).all()
    return render_template('admin/dashboard.html', docs=docs, categories=cats,
                           stats=stats, feedbacks=feedbacks)


# --- Doc CRUD ---

@app.route('/admin/doc/new', methods=['GET', 'POST'])
@login_required
def admin_doc_new():
    cats = Category.query.order_by(Category.sort_order).all()
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '')
        description = request.form.get('description', '').strip()
        category_id = request.form.get('category_id', type=int)
        is_published = 'is_published' in request.form
        is_featured = 'is_featured' in request.form
        sort_order = request.form.get('sort_order', 0, type=int) or 0
        slug = ensure_unique_slug(Doc, slugify(title))
        doc = Doc(title=title, content=content, description=description, slug=slug,
                  category_id=category_id, is_published=is_published,
                  is_featured=is_featured, sort_order=sort_order)
        db.session.add(doc)
        db.session.flush()
        save_version(doc, '최초 생성')
        db.session.commit()
        flash('문서가 생성되었습니다.', 'success')
        return redirect(url_for('admin_doc_edit', doc_id=doc.id))
    return render_template('admin/editor.html', doc=None, categories=cats)

@app.route('/admin/doc/<int:doc_id>/edit', methods=['GET', 'POST'])
@login_required
def admin_doc_edit(doc_id):
    doc = Doc.query.get_or_404(doc_id)
    cats = Category.query.order_by(Category.sort_order).all()
    if request.method == 'POST':
        old_content = doc.content
        doc.title = request.form.get('title', '').strip()
        doc.content = request.form.get('content', '')
        doc.description = request.form.get('description', '').strip()
        doc.category_id = request.form.get('category_id', type=int)
        doc.is_published = 'is_published' in request.form
        doc.is_featured = 'is_featured' in request.form
        doc.sort_order = request.form.get('sort_order', 0, type=int) or 0
        if old_content != doc.content:
            msg = request.form.get('version_message', '').strip() or '내용 수정'
            save_version(doc, msg)
        db.session.commit()
        flash('문서가 저장되었습니다.', 'success')
        return redirect(url_for('admin_doc_edit', doc_id=doc.id))
    return render_template('admin/editor.html', doc=doc, categories=cats)

@app.route('/admin/doc/<int:doc_id>/delete', methods=['POST'])
@login_required
def admin_doc_delete(doc_id):
    doc = Doc.query.get_or_404(doc_id)
    db.session.delete(doc)
    db.session.commit()
    flash('문서가 삭제되었습니다.', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/doc/<int:doc_id>/preview')
@login_required
def admin_doc_preview(doc_id):
    doc = Doc.query.get_or_404(doc_id)
    html_content = render_markdown(doc.content)
    toc = extract_toc(doc.content)
    cats = Category.query.order_by(Category.sort_order).all()
    return render_template('index.html', categories=cats, doc=doc, toc=toc,
                           html_content=html_content, prev_doc=None, next_doc=None)


# --- Reorder ---

@app.route('/admin/doc/reorder', methods=['POST'])
@login_required
def admin_doc_reorder():
    data = request.get_json()
    items = data.get('items', [])
    for i, item in enumerate(items):
        doc = Doc.query.get(item['id'])
        if doc:
            doc.sort_order = i
            if item.get('category_id'):
                doc.category_id = item['category_id']
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/admin/category/reorder', methods=['POST'])
@login_required
def admin_category_reorder():
    data = request.get_json()
    items = data.get('items', [])
    for i, item in enumerate(items):
        cat = Category.query.get(item['id'])
        if cat:
            cat.sort_order = i
    db.session.commit()
    return jsonify({'ok': True})


# --- Category management ---

@app.route('/admin/category/new', methods=['POST'])
@login_required
def admin_category_new():
    name = request.form.get('name', '').strip()
    icon = request.form.get('icon', '📄').strip() or '📄'
    if name:
        slug = ensure_unique_slug(Category, slugify(name))
        cat = Category(name=name, slug=slug, icon=icon,
                       sort_order=Category.query.count())
        db.session.add(cat)
        db.session.commit()
        flash('카테고리가 생성되었습니다.', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/category/<int:cat_id>/delete', methods=['POST'])
@login_required
def admin_category_delete(cat_id):
    cat = Category.query.get_or_404(cat_id)
    db.session.delete(cat)
    db.session.commit()
    flash('카테고리가 삭제되었습니다.', 'success')
    return redirect(url_for('admin_dashboard'))


# --- Version history ---

@app.route('/admin/doc/<int:doc_id>/versions')
@login_required
def admin_doc_versions(doc_id):
    doc = Doc.query.get_or_404(doc_id)
    return render_template('admin/versions.html', doc=doc)

@app.route('/admin/doc/<int:doc_id>/restore/<int:version_id>', methods=['POST'])
@login_required
def admin_doc_restore(doc_id, version_id):
    doc = Doc.query.get_or_404(doc_id)
    version = DocVersion.query.get_or_404(version_id)
    save_version(doc, f'복원 전 (버전 #{version.id})')
    doc.title = version.title
    doc.content = version.content
    db.session.commit()
    flash('이전 버전으로 복원되었습니다.', 'success')
    return redirect(url_for('admin_doc_edit', doc_id=doc.id))

@app.route('/admin/doc/<int:doc_id>/diff/<int:version_id>')
@login_required
def admin_doc_diff(doc_id, version_id):
    doc = Doc.query.get_or_404(doc_id)
    version = DocVersion.query.get_or_404(version_id)
    return jsonify({
        'current': doc.content,
        'version': version.content,
        'version_title': version.title,
        'version_message': version.message,
        'version_date': version.created_at.isoformat() if version.created_at else None,
    })


# --- AI routes ---

@app.route('/admin/ai/generate', methods=['POST'])
@login_required
def ai_generate():
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    mode = data.get('mode', 'write')
    if not prompt:
        return jsonify({'error': '프롬프트를 입력해주세요.'}), 400

    sys = '너는 전문적인 호스팅 서비스 기술 문서 작성자다. '
    '마크다운 형식으로 작성하며, 한국어로 명확하고 읽기 좋게 작성한다. '
    '코드 예제, 표, 인용구를 적절히 활용한다.'

    if mode == 'rewrite':
        messages = [
            {'role': 'system', 'content': sys},
            {'role': 'user', 'content': f'다음 문서를 더 명확하고 읽기 좋게 개선해주세요.\n\n요청: {prompt}\n\n문서:\n{data.get("current_content", "")}'}
        ]
    elif mode == 'outline':
        messages = [
            {'role': 'system', 'content': '너는 호스팅 서비스 문서 기획자다. 마크다운 목차를 작성한다. 한국어로.'},
            {'role': 'user', 'content': f'주제: {prompt}\n문서 목차를 작성해주세요.'}
        ]
    elif mode == 'faq':
        messages = [
            {'role': 'system', 'content': sys},
            {'role': 'user', 'content': f'주제: {prompt}\n자주 묻는 질문(FAQ) 형식으로 문서를 작성해주세요. 각 질문은 ### 로 시작한다.'}
        ]
    elif mode == 'troubleshoot':
        messages = [
            {'role': 'system', 'content': sys},
            {'role': 'user', 'content': f'주제: {prompt}\n문제 해결(Troubleshooting) 가이드를 작성해주세요. 각 문제는 ### 로 시작하고 원인과 해결책을 포함하세요.'}
        ]
    elif mode == 'summarize':
        messages = [
            {'role': 'system', 'content': '너는 문서 요약 전문가다. 한국어로 마크다운 형식으로 요약한다.'},
            {'role': 'user', 'content': f'다음 내용을 간결하게 요약해주세요:\n\n{data.get("current_content", "")}\n\n요청: {prompt}'}
        ]
    else:
        messages = [
            {'role': 'system', 'content': sys},
            {'role': 'user', 'content': f'다음 주제로 호스팅 서비스 문서를 작성해주세요:\n\n{prompt}\n\n적절한 제목, 개요, 단계별 설명, 코드 예제, 표를 포함해주세요.'}
        ]

    try:
        result = call_ai_api(messages)
        return jsonify({'content': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/ai/chat', methods=['POST'])
@login_required
def ai_chat():
    data = request.get_json()
    messages = data.get('messages', [])
    if not messages:
        return jsonify({'error': '메시지가 없습니다.'}), 400
    sys_msg = {'role': 'system', 'content': '너는 호스팅 서비스 문서 작성 도우미다. 마크다운 형식으로 답변하고 한국어로 작성한다.'}
    messages = [sys_msg] + messages[-20:]
    try:
        result = call_ai_api(messages)
        return jsonify({'content': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/ai/preview-markdown', methods=['POST'])
@login_required
def ai_preview_markdown():
    content = request.form.get('content', '')
    return render_markdown(content)


# ============================================================
#  Init & run
# ============================================================

def init_db():
    db.create_all()
    # Only provision an admin when the deployment explicitly supplies credentials.
    env_user = os.getenv('ADMIN_USERNAME')
    env_pass = os.getenv('ADMIN_PASSWORD')
    if env_user and env_pass and not User.query.filter_by(username=env_user).first():
        u = User(username=env_user, password_hash=generate_password_hash(env_pass))
        db.session.add(u)
        db.session.commit()

    if Category.query.count() == 0:
        seeds = [
            ('시작하기', '🚀'), ('가이드', '📖'), ('API 레퍼런스', '🔌'), ('FAQ', '❓')
        ]
        for i, (name, icon) in enumerate(seeds):
            db.session.add(Category(name=name, slug=slugify(name), icon=icon, sort_order=i))
        db.session.commit()

    if Doc.query.count() == 0:
        cat = Category.query.filter_by(slug=slugify('시작하기')).first()
        welcome = '''# Wickedhost Docs에 오신 것을 환영합니다

> **Wickedhost Docs**는 호스팅 서비스의 모든 문서를 한 곳에서 제공합니다.

## 주요 기능

- **실시간 검색** — 필요한 문서를 빠르게 찾아보세요
- **카테고리별 탐색** — 체계적으로 정리된 문서 구조
- **다크모드** — 눈이 편안한 테마를 지원합니다
- **목차 네비게이션** — 문서 내 목차로 빠르게 이동
- **코드 복사** — 원클릭으로 코드를 복사하세요
- **문서 평가** — 도움이 되었는지 피드백을 남겨주세요

## 문서 탐색

왼쪽 사이드바에서 원하는 카테고리를 선택하고, 문서를 클릭하여 읽어보세요.

```bash
# 예시: SSH 접속
ssh username@your-server-ip
```

| 기능 | 설명 |
|------|------|
| 검색 | 상단 검색바 사용 |
| 다크모드 | 우측 상단 토글 |
| 목차 | 우측 사이드바 |

---

문의사항이 있으시면 관리자에게 연락해주세요.'''
        doc = Doc(title='환영합니다', slug='welcome', content=welcome,
                  description='Wickedhost Docs 소개 및 주요 기능 안내',
                  category_id=cat.id if cat else None, is_published=True,
                  is_featured=True, sort_order=0)
        db.session.add(doc)
        db.session.flush()
        save_version(doc, '최초 생성')
        db.session.commit()


@app.cli.command('init-db')
def cli_init_db():
    init_db()
    print('데이터베이스가 초기화되었습니다.')


if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(host='0.0.0.0', port=8080, debug=os.getenv('FLASK_ENV') != 'production')

import os
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, login_required, logout_user, current_user
from itsdangerous import URLSafeTimedSerializer

from extensions import db, login_manager
from models import User, Note, Tag

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-prod' # TODO: Env var
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB limit
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Initialize Extensions
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = "login"
login_manager.login_message = None # No popups

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Create Tables
with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Auth Routes ---

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        name = request.form.get('name')
        password = request.form.get('password')
        
        if not email or not name or not password:
            flash('All fields are required.')
            return redirect(url_for('register'))
            
        if User.query.filter_by(email=email).first():
            flash('Email already exists.')
            return redirect(url_for('register'))
            
        new_user = User(
            email=email, 
            name=name, 
            password_hash=generate_password_hash(password, method='scrypt')
        )
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        return redirect(url_for('index'))
        
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            remember = True if request.form.get('remember') else False
            login_user(user, remember=remember)
            return redirect(url_for('index'))
        else:
            flash('Invalid email or password.')
            
    return render_template('login.html')

# --- Security Helpers ---
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
security_logger = logging.getLogger('security')

# In-Memory Rate Limit Store: { 'email': [timestamp1, timestamp2, ...] }
RESET_REQUESTS = {}

def check_rate_limit(email):
    now = datetime.now()
    if email not in RESET_REQUESTS:
        RESET_REQUESTS[email] = []
    
    # Filter out requests older than 1 hour
    RESET_REQUESTS[email] = [t for t in RESET_REQUESTS[email] if (now - t).total_seconds() < 3600]
    
    if len(RESET_REQUESTS[email]) >= 5:
        return False
    
    RESET_REQUESTS[email].append(now)
    return True

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        email = request.form.get('email')
        
        # 1. Rate Limit Check
        if not check_rate_limit(email):
            security_logger.warning(f"RATE LIMIT EXCEEDED: Password reset attempt for {email} from {request.remote_addr}")
            flash('Too many requests. Please try again in an hour.')
            return redirect(url_for('forgot_password'))

        user = User.query.filter_by(email=email).first()
        
        if user:
            # Generate Token
            s = URLSafeTimedSerializer(app.config['SECRET_KEY'])
            token = s.dumps(email, salt='password-reset-salt')
            
            # Simulate Email Sending (Print to Console)
            reset_url = url_for('reset_password', token=token, _external=True)
            print("="*50)
            print(f"MOCK EMAIL TO: {email}")
            print(f"RESET LINK: {reset_url}")
            print("="*50)
            
            security_logger.info(f"RESET REQUEST: Link generated for {email} from {request.remote_addr}")
            flash('Password reset link has been sent to your email (Check Terminal Console).')
        else:
            # Security: Don't reveal if email exists
            security_logger.info(f"RESET ATTEMPT: Non-existent email {email} from {request.remote_addr}")
            flash('Password reset link has been sent to your email (Check Terminal Console).')
            
        return redirect(url_for('login'))
        
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    s = URLSafeTimedSerializer(app.config['SECRET_KEY'])
    try:
        email = s.loads(token, salt='password-reset-salt', max_age=1800) # 30 Minutes Expiry
    except:
        security_logger.warning(f"RESET FAILED: Invalid/Expired token from {request.remote_addr}")
        flash('The password reset link is invalid or has expired.')
        return redirect(url_for('login'))
        
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match.')
            return redirect(url_for('reset_password', token=token))
            
        user = User.query.filter_by(email=email).first()
        if user:
            user.password_hash = generate_password_hash(password, method='scrypt')
            db.session.commit()
            flash('Your password has been updated! You can now log in.')
            security_logger.info(f"RESET SUCCESS: Password changed for {email} from {request.remote_addr}")
            return redirect(url_for('login'))
        else:
            flash('User not found.')
            return redirect(url_for('login'))
            
    return render_template('reset_password.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# --- App Routes ---

@app.route('/')
def index():
    # Public Landing Page
    if not current_user.is_authenticated:
        return render_template('landing.html')

    # App Workspace (Logged In)
    # Sort: Pinned DESC, Created DESC (Updated ignored)
    items = Note.query.filter_by(user_id=current_user.id, deleted=False)\
        .order_by(Note.pinned.desc(), Note.created_at.desc()).all()
    
    # Parse media JSON for template
    # We do a quick transform so template logic remains similar
    display_items = []
    for item in items:
        try:
            media = json.loads(item.media_json)
        except:
            media = []
        
        # Attach to object (temporary attribute for template)
        item.media = media
        display_items.append(item)
        
    # Fetch Tags for Label Bar
    tags = Tag.query.filter_by(user_id=current_user.id).order_by(Tag.name).all()
        
    return render_template('index.html', items=display_items, tags=tags)

@app.route('/bin')
@login_required
def view_bin():
    # Bin Sort: Created DESC (Consistent)
    items = Note.query.filter_by(user_id=current_user.id, deleted=True)\
        .order_by(Note.created_at.desc()).all()
        
    display_items = []
    for item in items:
        try:
            media = json.loads(item.media_json)
        except:
            media = []
        item.media = media
        display_items.append(item)
        
    return render_template('bin.html', items=display_items)


from datetime import timedelta

# ... (Previous Imports)
from flask import abort

# ... (Configuration)

# --- Auto Purge Logic ---
last_purge_run = None

@app.before_request
def purge_deleted_notes():
    global last_purge_run
    # Throttle: Run at most once every 6 hours
    if last_purge_run and datetime.now() - last_purge_run < timedelta(hours=6):
        return

    # Check tables exist first to avoid startup errors
    try:
        cutoff = datetime.now() - timedelta(days=30)
        notes_to_purge = Note.query.filter(Note.deleted == True, Note.deleted_at < cutoff).all()
        
        for note in notes_to_purge:
            # Here we would delete physical files if we were rigorous, but for now just DB record
            db.session.delete(note)
            
        if notes_to_purge:
            db.session.commit()
            
        last_purge_run = datetime.now()
    except:
        pass # DB might not be Init yet

# ... (Rest of App)

@app.route('/update/<int:id>', methods=['POST'])
@login_required
def update(id):
    note = Note.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    
    # 🔒 GUARD: Immutable if deleted
    if note.deleted:
        abort(403)
        
    data = request.get_json()
    if data:
        # JSON Update
        if 'title' in data: note.title = data['title']
        if 'content' in data: note.content = data['content']
        if 'pinned' in data: note.pinned = data['pinned']
        
        db.session.commit()
        return jsonify({'status': 'success'})
        
    return jsonify({'status': 'error'}), 400

@app.route('/bin_action/<int:id>/<action>', methods=['POST'])
@login_required
def bin_action(id, action):
    note = Note.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    
    if action == 'delete':
        note.deleted = True
        note.deleted_at = datetime.now() # Set timestamp (Local)
    elif action == 'restore':
        note.deleted = False
        note.deleted_at = None # Clear timestamp
    elif action == 'permanent':
        db.session.delete(note)
        
    db.session.commit()
    return redirect(url_for('index' if action == 'restore' else 'view_bin'))

@app.route('/add', methods=['POST'])
@login_required
def add():
    title = request.form.get('title', '').strip()
    content = request.form.get('content', '').strip()
    media_json_str = request.form.get('media_json', '[]')
    
    # Parse to validate
    try:
        media = json.loads(media_json_str)
        # Ensure IDs
        for m in media:
            if 'id' not in m: m['id'] = str(uuid.uuid4())
    except:
        media = []
        
    # vFinal Rule: Empty Notes = Ghost Delete
    if not title and not content and not media:
        return redirect(url_for('index'))

    # Auto-Title if missing
    if not title and content:
         title = " ".join(content.split()[:3]) + "..."
             
    new_note = Note(
        user_id=current_user.id,
        title=title,
        content=content,
        media_json=json.dumps(media),
        created_at=datetime.now() # USE LOCAL
    )
    db.session.add(new_note)
    db.session.commit()
    
    return redirect(url_for('index', _anchor='app-workspace'))

# --- Legacy Soft Delete Route (Mapped to new logic) ---
@app.route('/delete/<int:item_id>', methods=['POST'])
@login_required
def soft_delete(item_id):
    # This was the old route for inline delete
    return bin_action(item_id, 'delete')

@app.route('/restore/<int:item_id>', methods=['POST'])
@login_required
def restore(item_id):
    return bin_action(item_id, 'restore')

@app.route('/permanent_delete/<int:item_id>', methods=['POST'])
@login_required
def permanent_delete(item_id):
    return bin_action(item_id, 'permanent')

@app.route('/restore_all', methods=['POST'])
@login_required
def restore_all():
    items = Note.query.filter_by(user_id=current_user.id, deleted=True).all()
    for item in items:
        item.deleted = False
        item.deleted_at = None
    db.session.commit()
    return redirect(url_for('index'))

@app.route('/erase_all', methods=['POST'])
@login_required
def erase_all():
    items = Note.query.filter_by(user_id=current_user.id, deleted=True).all()
    for item in items:
        db.session.delete(item)
    db.session.commit()
    return redirect(url_for('view_bin'))

@app.route('/media/<note_id>/<media_id>/delete', methods=['POST'])
@login_required
def delete_media(note_id, media_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user.id).first_or_404()
    
    # 🔒 GUARD
    if note.deleted: abort(403)
    
    try:
        media_list = json.loads(note.media_json)
        new_list = [m for m in media_list if m.get('id') != media_id]
        note.media_json = json.dumps(new_list)
        db.session.commit()
        return jsonify({'status': 'success'})
    except:
        return jsonify({'status': 'error'}), 500

@app.route('/note/<int:note_id>/add_media', methods=['POST'])
@login_required
def add_media_to_note(note_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user.id).first_or_404()
    
    # 🔒 GUARD
    if note.deleted: abort(403)
    
    if 'file' not in request.files: return jsonify({'status': 'error'}), 400
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename): return jsonify({'status': 'error'}), 400
    
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
    url = url_for('static', filename=f'uploads/{unique_name}')
    
    try:
        media = json.loads(note.media_json)
    except:
        media = []
        
    new_media_item = {'id': str(uuid.uuid4()), 'type': 'image', 'url': url}
    media.append(new_media_item)
    note.media_json = json.dumps(media)
    
    db.session.commit()
    
    return jsonify({'status': 'success', 'media': new_media_item})

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files: return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename): return jsonify({'error': 'Invalid file'}), 400
    
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_name))
    
    url = url_for('static', filename=f'uploads/{unique_name}')
    return jsonify({'status': 'success', 'url': url})

    return jsonify({'status': 'success', 'url': url})

# --- Tag Routes ---

@app.route('/tags', methods=['GET'])
@login_required
def get_tags():
    tags = Tag.query.filter_by(user_id=current_user.id).all()
    return jsonify([{'id': t.id, 'name': t.name, 'color': t.color} for t in tags])

@app.route('/tags', methods=['POST'])
@login_required
def create_tag():
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name: return jsonify({'status': 'error'}), 400
    
    # Check duplicate
    existing = Tag.query.filter_by(user_id=current_user.id, name=name).first()
    if existing:
        return jsonify({'id': existing.id, 'name': existing.name, 'color': existing.color})
    
    new_tag = Tag(user_id=current_user.id, name=name)
    db.session.add(new_tag)
    db.session.commit()
    return jsonify({'id': new_tag.id, 'name': new_tag.name, 'color': new_tag.color})

@app.route('/notes/<int:note_id>/tags', methods=['POST'])
@login_required
def add_tag_to_note(note_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user.id).first_or_404()
    if note.deleted: abort(403)
    
    data = request.get_json()
    tag_name = data.get('tag_name', '').strip()
    if not tag_name: return jsonify({'status': 'error'}), 400
    
    # Find or Create Tag
    tag = Tag.query.filter_by(user_id=current_user.id, name=tag_name).first()
    if not tag:
        tag = Tag(user_id=current_user.id, name=tag_name)
        db.session.add(tag)
        db.session.commit()
        
    if tag not in note.tags:
        note.tags.append(tag)
        db.session.commit()
        
    return jsonify({'status': 'success', 'tag': {'id': tag.id, 'name': tag.name, 'color': tag.color}})

@app.route('/notes/<int:note_id>/tags/<int:tag_id>', methods=['DELETE'])
@login_required
def remove_tag_from_note(note_id, tag_id):
    note = Note.query.filter_by(id=note_id, user_id=current_user.id).first_or_404()
    if note.deleted: abort(403)
    
    tag = Tag.query.get_or_404(tag_id)
    if tag in note.tags:
        note.tags.remove(tag)
        db.session.commit()
        
    return jsonify({'status': 'success'})


@app.route('/pin/<int:item_id>', methods=['POST'])
@login_required
def toggle_pin(item_id):
    note = Note.query.filter_by(id=item_id, user_id=current_user.id).first_or_404()
    data = request.json
    if 'pinned' in data:
        note.pinned = bool(data['pinned'])
        db.session.commit()
    return jsonify({'status': 'success', 'pinned': note.pinned})

@app.route('/tags/batch_apply', methods=['POST'])
@login_required
def batch_apply_tag():
    data = request.get_json()
    tag_name = data.get('tag_name', '').strip()
    note_ids = data.get('note_ids', [])
    
    if not tag_name: return jsonify({'status': 'error', 'message': 'Tag name required'}), 400
    
    # 1. Find or Create Tag
    tag = Tag.query.filter_by(user_id=current_user.id, name=tag_name).first()
    if not tag:
        tag = Tag(user_id=current_user.id, name=tag_name)
        db.session.add(tag)
        db.session.flush() # Get ID without commit yet
        
    # 2. Batch Apply
    count = 0
    if note_ids:
        notes = Note.query.filter(Note.id.in_(note_ids), Note.user_id == current_user.id).all()
        for note in notes:
            if tag not in note.tags:
                note.tags.append(tag)
                count += 1
                
    db.session.commit()
    
    return jsonify({
        'status': 'success', 
        'tag': {'id': tag.id, 'name': tag.name, 'color': tag.color},
        'applied_count': count
    })


if __name__ == '__main__':
    app.run(debug=True)

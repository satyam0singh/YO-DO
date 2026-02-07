from flask_login import UserMixin
from extensions import db
from datetime import datetime
import json

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    notes = db.relationship('Note', backref='user', lazy=True)

    def __repr__(self):
        return f"<User {self.id} {self.email}>"

# Many-to-Many Helper Table
note_tags = db.Table('note_tags',
    db.Column('note_id', db.Integer, db.ForeignKey('note.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # Private tags
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), default='#e2e8f0') # Default light gray
    
    def __repr__(self):
        return f"<Tag {self.name}>"

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    title = db.Column(db.Text)
    content = db.Column(db.Text)

    # JSON String: Always json.loads() before use, json.dumps() before save
    media_json = db.Column(db.Text, default='[]')

    pinned = db.Column(db.Boolean, default=False)
    deleted = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Only updated if explicit feature added later.
    updated_at = db.Column(db.DateTime, nullable=True) 
    
    # Lifecycle
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Tags Relationship
    tags = db.relationship('Tag', secondary=note_tags, lazy='subquery',
        backref=db.backref('notes', lazy=True))

    def __repr__(self):
        return f"<Note {self.id} user={self.user_id}>"

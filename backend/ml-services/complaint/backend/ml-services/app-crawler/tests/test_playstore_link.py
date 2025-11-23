
import os
import sys
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app_api import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_playstore_link_official(client):
    # Official Google Pay app
    resp = client.post('/check_app', data={'playstore_link': 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user'})
    data = resp.get_json()
    assert data['status'] == 'safe'
    assert 'Official app' in data['details']

def test_playstore_link_lookalike(client):
    # Lookalike package
    resp = client.post('/check_app', data={'playstore_link': 'https://play.google.com/store/apps/details?id=com.go0gle.android.apps.nbu.paisa.user'})
    data = resp.get_json()
    assert data['status'] == 'suspicious'
    assert 'Lookalike' in data['details']

def test_playstore_link_unknown(client):
    # Unknown package
    resp = client.post('/check_app', data={'playstore_link': 'https://play.google.com/store/apps/details?id=com.unknown.app'})
    data = resp.get_json()
    assert data['status'] == 'fraud'
    assert 'Unknown' in data['details']

def test_playstore_link_invalid(client):
    # Invalid link
    resp = client.post('/check_app', data={'playstore_link': 'https://play.google.com/store/apps/details?foo=bar'})
    data = resp.get_json()
    assert data['status'] == 'error'
    assert 'extract' in data['details']

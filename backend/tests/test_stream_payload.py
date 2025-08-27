from backend.app.main import _make_brain_payload

def test_make_brain_payload_shape():
    p = _make_brain_payload()
    assert 'metrics' in p
    m = p['metrics']
    assert 'activation_mean' in m
    assert 'regions' in m
    assert set(m['regions'].keys()) >= {'Frontal', 'Parietal', 'Temporal', 'Occipital'}

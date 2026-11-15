"""Portable artifact association. Git checkout times are not render provenance."""
import hashlib

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def image_provenance(image, master, record, manifest, root):
    image_hash,master_hash=sha256(image),sha256(master)
    if record.get('master_sha256') or record.get('image_sha256'):
        if record.get('master_sha256')!=master_hash or record.get('image_sha256')!=image_hash:
            raise ValueError('Render record hash mismatch: '+image.name)
        return 'hashed_render_record'
    entries={entry['file']:entry['sha256'] for entry in manifest}
    if entries.get(master.relative_to(root).as_posix())!=master_hash or entries.get(image.relative_to(root).as_posix())!=image_hash:
        raise ValueError('No verified image/master association: '+image.name)
    return 'archived_delivery_manifest_with_documented_cosmetic_difference'

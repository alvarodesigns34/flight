"""Regression: restored or future mtimes must not override content verification."""
import unittest, tempfile, sys, json, os, hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'PROJECT_TOMCAT/src'))
from delivery_provenance import image_provenance,sha256
class ProvenanceTests(unittest.TestCase):
    def test_timestamps_cannot_accept_tampering(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);master=root/'master.blend';image=root/'image.png'
            master.write_bytes(b'master');image.write_bytes(b'image')
            manifest=[{'file':p.name,'sha256':sha256(p)} for p in [master,image]]
            os.utime(image,(1,1));os.utime(master,(2000000000,2000000000))
            self.assertTrue(image_provenance(image,master,{},manifest,root).startswith('archived'))
            image.write_bytes(b'tampered');os.utime(image,(2100000000,2100000000))
            with self.assertRaises(ValueError):image_provenance(image,master,{},manifest,root)
    def test_new_render_records_are_hash_verified(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);master=root/'master';image=root/'image'
            master.write_bytes(b'm');image.write_bytes(b'i')
            record={'master_sha256':sha256(master),'image_sha256':sha256(image)}
            self.assertEqual(image_provenance(image,master,record,[],root),'hashed_render_record')
            master.write_bytes(b'changed')
            with self.assertRaises(ValueError):image_provenance(image,master,record,[],root)
if __name__=='__main__':unittest.main()

// A disposable app launched only inside the isolated test session.
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';

const application = new Gtk.Application({application_id: 'org.example.GDXDockTest',
    flags: Gio.ApplicationFlags.DEFAULT_FLAGS});
const newWindow = new Gio.SimpleAction({name: 'new-window'});
newWindow.connect('activate', () => application.activate());
application.add_action(newWindow);
application.connect('activate', () => {
    const window = new Gtk.ApplicationWindow({application, title: 'GDX Test App',
        default_width: 500, default_height: 320});
    window.set_child(new Gtk.Label({label: 'GDX Dock — real application launch test'}));
    window.present();
});
application.run([]);

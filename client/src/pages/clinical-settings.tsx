import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Users,
  Database,
  Shield,
  Download,
  Bell,
  Clock,
  FileText,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClinicalSettings() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // System Settings
    sessionTimeout: '120',
    autoLogout: true,
    dataRetention: '7',
    backupFrequency: 'daily',
    
    // Study Settings
    assessmentReminders: true,
    completionNotifications: true,
    outlierAlerts: true,
    criticalThreshold: '15',
    
    // Export Settings
    exportFormat: 'csv',
    includeRawData: false,
    deidentifyExports: true,
    
    // Notification Settings
    emailNotifications: true,
    smsAlerts: false,
    alertFrequency: 'immediate'
  });

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole(['admin'])) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Access Restricted</h3>
          <p className="text-muted-foreground">
            Administrator privileges required to access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clinical Settings</h2>
        <p className="text-muted-foreground">
          Configure system settings, study parameters, and data management preferences.
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="study">Study</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure core system settings and security parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Data Retention (years)</Label>
                  <Input
                    id="dataRetention"
                    type="number"
                    value={settings.dataRetention}
                    onChange={(e) => setSettings(prev => ({ ...prev, dataRetention: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Logout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out users after session timeout
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoLogout}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoLogout: checked }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select value={settings.backupFrequency} onValueChange={(value) => setSettings(prev => ({ ...prev, backupFrequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Study Settings */}
        <TabsContent value="study" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Study Parameters</span>
              </CardTitle>
              <CardDescription>
                Configure assessment protocols and study-specific settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Assessment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders for scheduled assessments
                    </p>
                  </div>
                  <Switch
                    checked={settings.assessmentReminders}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, assessmentReminders: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Completion Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when patients complete assessments
                    </p>
                  </div>
                  <Switch
                    checked={settings.completionNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, completionNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Outlier Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when assessment scores fall outside normal ranges
                    </p>
                  </div>
                  <Switch
                    checked={settings.outlierAlerts}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, outlierAlerts: checked }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="criticalThreshold">Critical Score Threshold (%)</Label>
                <Input
                  id="criticalThreshold"
                  type="number"
                  value={settings.criticalThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, criticalThreshold: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Scores below this percentage will trigger critical alerts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Users</span>
                  <Badge variant="secondary">24</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clinicians</span>
                  <Badge variant="secondary">18</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Researchers</span>
                  <Badge variant="secondary">4</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Administrators</span>
                  <Badge variant="secondary">2</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Button className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Manage User Accounts
                </Button>
                <Button variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Role Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
              <CardDescription>
                Configure data export, backup, and retention settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exportFormat">Default Export Format</Label>
                  <Select value={settings.exportFormat} onValueChange={(value) => setSettings(prev => ({ ...prev, exportFormat: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Raw Motion Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Include detailed motion tracking data in exports
                    </p>
                  </div>
                  <Switch
                    checked={settings.includeRawData}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeRawData: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>De-identify Exports</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically remove identifying information from exports
                    </p>
                  </div>
                  <Switch
                    checked={settings.deidentifyExports}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, deidentifyExports: checked }))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Button className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Study Data
                </Button>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Database Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Alert Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure notification preferences and alert thresholds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive critical alerts via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.smsAlerts}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsAlerts: checked }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alertFrequency">Alert Frequency</Label>
                  <Select value={settings.alertFrequency} onValueChange={(value) => setSettings(prev => ({ ...prev, alertFrequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving} className="min-w-32">
          {saving ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import QrScanner from 'react-qr-scanner';

interface Item {
  id: string;
  number: string;
  name: string;
  description: string;
  depositor: string;
  dateReceived: string;
  dateIssued?: string;
  dateReturned?: string;
  status: 'хранится' | 'выдан' | 'возвращён' | 'архив';
  qrCode?: string;
}

const Index = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [showScanner, setShowScanner] = useState(false);
  const [showReturnScanner, setShowReturnScanner] = useState(false);
  const scannerRef = useRef<any>(null);
  const returnScannerRef = useRef<any>(null);

  const [depositForm, setDepositForm] = useState({
    name: '',
    description: '',
    depositor: ''
  });

  const [issueNumber, setIssueNumber] = useState('');
  const [returnNumber, setReturnNumber] = useState('');

  const generateItemNumber = () => {
    return `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  const generateQRCode = async (text: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(text, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1E40AF',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const speakNumber = (number: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Номер документа: ${number}`);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDeposit = async () => {
    if (!depositForm.name || !depositForm.depositor) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const itemNumber = generateItemNumber();
    const qrCode = await generateQRCode(itemNumber);

    const newItem: Item = {
      id: Date.now().toString(),
      number: itemNumber,
      name: depositForm.name,
      description: depositForm.description,
      depositor: depositForm.depositor,
      dateReceived: new Date().toLocaleDateString('ru-RU'),
      status: 'хранится',
      qrCode
    };

    setItems([newItem, ...items]);
    setSelectedQR(qrCode);
    setShowQRDialog(true);
    
    setDepositForm({ name: '', description: '', depositor: '' });
    
    toast.success(`Документ принят. Номер: ${itemNumber}`);
    speakNumber(itemNumber);
  };

  const handleIssue = (documentNumber?: string) => {
    const numberToCheck = documentNumber || issueNumber.trim();
    
    if (!numberToCheck) {
      toast.error('Введите номер документа');
      return;
    }

    const item = items.find(i => i.number === numberToCheck && i.status === 'хранится');

    if (!item) {
      toast.error('Документ не найден или уже выдан');
      speakNumber('не найден');
      return;
    }

    setItems(items.map(i => 
      i.id === item.id 
        ? { ...i, status: 'выдан', dateIssued: new Date().toLocaleDateString('ru-RU') }
        : i
    ));

    toast.success(`Выдан документ: ${item.name}`);
    speakNumber(item.number);
    setIssueNumber('');
    setShowScanner(false);
  };

  const handleReturn = (documentNumber?: string) => {
    const numberToCheck = documentNumber || returnNumber.trim();
    
    if (!numberToCheck) {
      toast.error('Введите номер документа');
      return;
    }

    const item = items.find(i => i.number === numberToCheck && i.status === 'выдан');

    if (!item) {
      toast.error('Документ не найден или не был выдан');
      speakNumber('не найден');
      return;
    }

    setItems(items.map(i => 
      i.id === item.id 
        ? { ...i, status: 'возвращён', dateReturned: new Date().toLocaleDateString('ru-RU') }
        : i
    ));

    toast.success(`Возвращён документ: ${item.name}`);
    speakNumber(item.number);
    setReturnNumber('');
    setShowReturnScanner(false);
  };

  const handleScan = (result: any) => {
    if (result?.text) {
      setIssueNumber(result.text);
      handleIssue(result.text);
    }
  };

  const handleReturnScan = (result: any) => {
    if (result?.text) {
      setReturnNumber(result.text);
      handleReturn(result.text);
    }
  };

  const handleScanError = (error: any) => {
    console.error('QR Scanner error:', error);
  };

  const handleArchive = (itemId: string) => {
    setItems(items.map(i => 
      i.id === itemId 
        ? { ...i, status: 'архив' }
        : i
    ));
    toast.success('Операция перенесена в архив');
  };

  const downloadQR = (qrCode: string, number: string) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `QR-${number}.png`;
    link.click();
  };

  const activeItems = items.filter(i => i.status === 'хранится');
  const issuedItems = items.filter(i => i.status === 'выдан');
  const returnedItems = items.filter(i => i.status === 'возвращён');
  const archivedItems = items.filter(i => i.status === 'архив');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <Icon name="QrCode" size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Система хранения</h1>
                <p className="text-sm text-slate-500">Автоматизированный учёт документов</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">На хранении</p>
                <p className="text-2xl font-bold text-primary">{activeItems.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-white border border-slate-200 p-1">
            <TabsTrigger value="main" className="gap-2">
              <Icon name="Home" size={18} />
              <span className="hidden sm:inline">Главная</span>
            </TabsTrigger>
            <TabsTrigger value="deposit" className="gap-2">
              <Icon name="ArrowDownToLine" size={18} />
              <span className="hidden sm:inline">Приёмка</span>
            </TabsTrigger>
            <TabsTrigger value="issue" className="gap-2">
              <Icon name="ArrowUpFromLine" size={18} />
              <span className="hidden sm:inline">Выдача</span>
            </TabsTrigger>
            <TabsTrigger value="return" className="gap-2">
              <Icon name="RotateCcw" size={18} />
              <span className="hidden sm:inline">Возврат</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Icon name="Clock" size={18} />
              <span className="hidden sm:inline">История</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Icon name="Settings" size={18} />
              <span className="hidden sm:inline">Админ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-6 animate-fade-in">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover-scale cursor-pointer border-2 hover:border-primary transition-all" onClick={() => setActiveTab('deposit')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Icon name="ArrowDownToLine" size={24} className="text-primary" />
                    </div>
                    <Icon name="ChevronRight" size={24} className="text-slate-400" />
                  </div>
                  <CardTitle className="text-xl">Приёмка</CardTitle>
                  <CardDescription>Регистрация нового документа с выдачей QR-кода</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-scale cursor-pointer border-2 hover:border-primary transition-all" onClick={() => setActiveTab('issue')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Icon name="ArrowUpFromLine" size={24} className="text-green-600" />
                    </div>
                    <Icon name="ChevronRight" size={24} className="text-slate-400" />
                  </div>
                  <CardTitle className="text-xl">Выдача</CardTitle>
                  <CardDescription>Выдача документа владельцу</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-scale cursor-pointer border-2 hover:border-primary transition-all" onClick={() => setActiveTab('return')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <Icon name="RotateCcw" size={24} className="text-orange-600" />
                    </div>
                    <Icon name="ChevronRight" size={24} className="text-slate-400" />
                  </div>
                  <CardTitle className="text-xl">Возврат</CardTitle>
                  <CardDescription>Приём документа обратно на хранение</CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-scale cursor-pointer border-2 hover:border-primary transition-all" onClick={() => setActiveTab('history')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Icon name="Clock" size={24} className="text-purple-600" />
                    </div>
                    <Icon name="ChevronRight" size={24} className="text-slate-400" />
                  </div>
                  <CardTitle className="text-xl">История</CardTitle>
                  <CardDescription>Журнал всех операций</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Package" size={24} />
                  Активные документы
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon name="Inbox" size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Документов на хранении нет</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Номер</TableHead>
                        <TableHead>Наименование</TableHead>
                        <TableHead>Владелец</TableHead>
                        <TableHead>Дата приёмки</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeItems.slice(0, 5).map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.number}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.depositor}</TableCell>
                          <TableCell>{item.dateReceived}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <Icon name="CheckCircle" size={14} className="mr-1" />
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposit" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="ArrowDownToLine" size={24} />
                  Приёмка документа
                </CardTitle>
                <CardDescription>Зарегистрируйте документ и получите уникальный QR-код</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Наименование документа *</Label>
                  <Input
                    id="name"
                    placeholder="Договор, паспорт, удостоверение..."
                    value={depositForm.name}
                    onChange={(e) => setDepositForm({ ...depositForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание (опционально)</Label>
                  <Textarea
                    id="description"
                    placeholder="Дополнительная информация о документе"
                    value={depositForm.description}
                    onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositor">ФИО владельца *</Label>
                  <Input
                    id="depositor"
                    placeholder="Иванов Иван Иванович"
                    value={depositForm.depositor}
                    onChange={(e) => setDepositForm({ ...depositForm, depositor: e.target.value })}
                  />
                </div>

                <Button onClick={handleDeposit} size="lg" className="w-full gap-2">
                  <Icon name="QrCode" size={20} />
                  Принять и создать QR-код
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issue" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="ArrowUpFromLine" size={24} />
                  Выдача документа
                </CardTitle>
                <CardDescription>Введите номер документа для выдачи с голосовым оповещением</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="issue-number">Номер документа</Label>
                  <div className="flex gap-2">
                    <Input
                      id="issue-number"
                      placeholder="DOC-1234567890-123"
                      value={issueNumber}
                      onChange={(e) => setIssueNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleIssue()}
                      className="font-mono flex-1"
                    />
                    <Button onClick={() => setShowScanner(!showScanner)} size="lg" variant="outline" className="gap-2">
                      <Icon name="Camera" size={20} />
                      Сканер
                    </Button>
                    <Button onClick={() => handleIssue()} size="lg" className="gap-2">
                      <Icon name="Volume2" size={20} />
                      Выдать
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">Введите номер или отсканируйте QR-код через камеру</p>
                </div>

                {showScanner && (
                  <Card className="p-4 bg-slate-50">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Icon name="Camera" size={20} />
                          Сканирование QR-кода
                        </h4>
                        <Button size="sm" variant="ghost" onClick={() => setShowScanner(false)}>
                          <Icon name="X" size={18} />
                        </Button>
                      </div>
                      <div className="relative aspect-square max-w-md mx-auto overflow-hidden rounded-lg border-4 border-primary">
                        <QrScanner
                          ref={scannerRef}
                          delay={300}
                          onError={handleScanError}
                          onScan={handleScan}
                          style={{ width: '100%' }}
                          constraints={{
                            video: { facingMode: 'environment' }
                          }}
                        />
                      </div>
                      <p className="text-sm text-center text-slate-600">Наведите камеру на QR-код документа</p>
                    </div>
                  </Card>
                )}

                {activeItems.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Icon name="List" size={20} />
                      Доступные для выдачи
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Номер</TableHead>
                          <TableHead>Документ</TableHead>
                          <TableHead>Владелец</TableHead>
                          <TableHead>Действие</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.number}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.depositor}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setIssueNumber(item.number);
                                  handleIssue();
                                }}
                                className="gap-1"
                              >
                                <Icon name="Volume2" size={16} />
                                Выдать
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="return" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="RotateCcw" size={24} />
                  Возврат документа
                </CardTitle>
                <CardDescription>Примите документ обратно на хранение</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="return-number">Номер документа</Label>
                  <div className="flex gap-2">
                    <Input
                      id="return-number"
                      placeholder="DOC-1234567890-123"
                      value={returnNumber}
                      onChange={(e) => setReturnNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleReturn()}
                      className="font-mono flex-1"
                    />
                    <Button onClick={() => setShowReturnScanner(!showReturnScanner)} size="lg" variant="outline" className="gap-2">
                      <Icon name="Camera" size={20} />
                      Сканер
                    </Button>
                    <Button onClick={() => handleReturn()} size="lg" className="gap-2">
                      <Icon name="Volume2" size={20} />
                      Принять
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">Введите номер или отсканируйте QR-код для возврата</p>
                </div>

                {showReturnScanner && (
                  <Card className="p-4 bg-slate-50">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Icon name="Camera" size={20} />
                          Сканирование QR-кода
                        </h4>
                        <Button size="sm" variant="ghost" onClick={() => setShowReturnScanner(false)}>
                          <Icon name="X" size={18} />
                        </Button>
                      </div>
                      <div className="relative aspect-square max-w-md mx-auto overflow-hidden rounded-lg border-4 border-primary">
                        <QrScanner
                          ref={returnScannerRef}
                          delay={300}
                          onError={handleScanError}
                          onScan={handleReturnScan}
                          style={{ width: '100%' }}
                          constraints={{
                            video: { facingMode: 'environment' }
                          }}
                        />
                      </div>
                      <p className="text-sm text-center text-slate-600">Наведите камеру на QR-код документа</p>
                    </div>
                  </Card>
                )}

                {issuedItems.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Icon name="List" size={20} />
                      Выданные документы (готовы к возврату)
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Номер</TableHead>
                          <TableHead>Документ</TableHead>
                          <TableHead>Владелец</TableHead>
                          <TableHead>Выдан</TableHead>
                          <TableHead>Действие</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issuedItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.number}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.depositor}</TableCell>
                            <TableCell>{item.dateIssued}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setReturnNumber(item.number);
                                  handleReturn();
                                }}
                                className="gap-1"
                              >
                                <Icon name="RotateCcw" size={16} />
                                Принять
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Clock" size={24} />
                  История операций
                </CardTitle>
                <CardDescription>Полный журнал приёма и выдачи документов</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon name="FileText" size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">История операций пуста</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Номер</TableHead>
                        <TableHead>Документ</TableHead>
                        <TableHead>Владелец</TableHead>
                        <TableHead>Приём</TableHead>
                        <TableHead>Выдача</TableHead>
                        <TableHead>Возврат</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.number}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.depositor}</TableCell>
                          <TableCell>{item.dateReceived}</TableCell>
                          <TableCell>{item.dateIssued || '—'}</TableCell>
                          <TableCell>{item.dateReturned || '—'}</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                item.status === 'хранится' 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                  : item.status === 'выдан'
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                  : item.status === 'возвращён'
                                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                                  : 'bg-slate-100 text-slate-800 hover:bg-slate-100'
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="animate-fade-in space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Settings" size={24} />
                  Администрирование
                </CardTitle>
                <CardDescription>Управление системой и архивирование</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 mb-1">Всего операций</p>
                    <p className="text-3xl font-bold text-slate-800">{items.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 mb-1">На хранении</p>
                    <p className="text-3xl font-bold text-green-800">{activeItems.length}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">В архиве</p>
                    <p className="text-3xl font-bold text-blue-800">{archivedItems.length}</p>
                  </div>
                </div>

                {returnedItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Icon name="Archive" size={20} />
                      Возвращённые документы (готовы к архивированию)
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Номер</TableHead>
                          <TableHead>Документ</TableHead>
                          <TableHead>Владелец</TableHead>
                          <TableHead>Возвращён</TableHead>
                          <TableHead>Действие</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnedItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.number}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.depositor}</TableCell>
                            <TableCell>{item.dateReturned}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleArchive(item.id)}
                                className="gap-1"
                              >
                                <Icon name="Archive" size={16} />
                                В архив
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="QrCode" size={24} />
              QR-код создан
            </DialogTitle>
            <DialogDescription>
              Распечатайте или сохраните QR-код для выдачи владельцу
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {selectedQR && (
              <>
                <div className="bg-white p-4 rounded-lg border-2 border-primary">
                  <img src={selectedQR} alt="QR Code" className="w-64 h-64" />
                </div>
                <Button 
                  onClick={() => {
                    const item = items[0];
                    if (item?.qrCode) {
                      downloadQR(item.qrCode, item.number);
                    }
                  }}
                  className="w-full gap-2"
                >
                  <Icon name="Download" size={20} />
                  Скачать QR-код
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
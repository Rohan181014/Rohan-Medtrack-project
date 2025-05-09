import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Category, Medication } from '@/types/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusIcon, Trash2Icon, EditIcon } from 'lucide-react';

const quotes = [
  "Medicine is a science of uncertainty and an art of probability. – William Osler",
  "The best doctor gives the least medicines. – Benjamin Franklin",
  "Wherever the art of Medicine is loved, there is also a love of Humanity. – Hippocrates",
  "The greatest wealth is health. – Virgil",
  "Take care of your body. It's the only place you have to live. – Jim Rohn",
  "An ounce of prevention is worth a pound of cure. – Benjamin Franklin",
  "Healing is a matter of time, but it is sometimes also a matter of opportunity. – Hippocrates"
];

function MedicalQuoteBanner() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % quotes.length);
        setFade(true);
      }, 500);
    }, 4500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [index]);

  return (
    <div className="w-full flex justify-center mb-6">
      <div className={`transition-opacity duration-500 text-lg md:text-xl font-semibold italic text-blue-700 bg-blue-50 px-6 py-3 rounded-xl shadow-md max-w-2xl text-center ${fade ? 'opacity-100' : 'opacity-0'}`}>{quotes[index]}</div>
    </div>
  );
}

export default function RegimenSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newMedication, setNewMedication] = useState<{
    name: string;
    dose: string;
    frequency_per_day: number;
    start_date: string;
    end_date: string | null;
    category_id: string | null;
  }>({
    name: '',
    dose: '',
    frequency_per_day: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    category_id: null,
  });

  useEffect(() => {
    if (user) {
      fetchMedications();
      fetchCategories();
    }
  }, [user]);

  async function fetchMedications() {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setMedications(data);
      }
    } catch (error: any) {
      console.error('Error fetching medications:', error.message);
      toast({
        title: 'Error',
        description: 'Could not fetch medications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setCategories(data);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error.message);
      toast({
        title: 'Error',
        description: 'Could not fetch categories',
        variant: 'destructive',
      });
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) {
      toast({
        title: 'Error',
        description: 'Category name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategory, user_id: user?.id }])
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        setCategories([...categories, data[0]]);
        setNewCategory('');
        toast({
          title: 'Success',
          description: 'Category added successfully',
        });
      }
    } catch (error: any) {
      console.error('Error adding category:', error.message);
      toast({
        title: 'Error',
        description: 'Could not add category',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setCategories(categories.filter(category => category.id !== id));
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting category:', error.message);
      toast({
        title: 'Error',
        description: 'Could not delete category. It may be in use by medications.',
        variant: 'destructive',
      });
    }
  }

  async function handleAddMedication() {
    if (!newMedication.name || !newMedication.dose) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const medicationToAdd = {
        ...newMedication,
        user_id: user?.id,
      };

      const { data, error } = await supabase
        .from('medications')
        .insert([medicationToAdd])
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        setMedications([...medications, data[0]]);
        setNewMedication({
          name: '',
          dose: '',
          frequency_per_day: 1,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: null,
          category_id: null,
        });
        toast({
          title: 'Success',
          description: 'Medication added successfully',
        });
      }
    } catch (error: any) {
      console.error('Error adding medication:', error.message);
      toast({
        title: 'Error',
        description: 'Could not add medication',
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteMedication(id: string) {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setMedications(medications.filter(medication => medication.id !== id));
      toast({
        title: 'Success',
        description: 'Medication deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting medication:', error.message);
      toast({
        title: 'Error',
        description: 'Could not delete medication',
        variant: 'destructive',
      });
    }
  }

  return (
    <Layout>
      <MedicalQuoteBanner />
      <h1 className="text-3xl font-extrabold text-blue-900 mb-8 tracking-tight text-center">Regimen Setup</h1>

      <Tabs defaultValue="medications">
        <TabsList className="mb-6">
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="medications">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add New Medication Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Add New Medication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <Input
                      value={newMedication.name}
                      onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                      placeholder="Medication name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dose</label>
                    <Input
                      value={newMedication.dose}
                      onChange={(e) => setNewMedication({ ...newMedication, dose: e.target.value })}
                      placeholder="e.g., 10mg, 1 tablet"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (per day)</label>
                    <Input
                      type="number"
                      min="1"
                      value={newMedication.frequency_per_day}
                      onChange={(e) => setNewMedication({
                        ...newMedication,
                        frequency_per_day: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={newMedication.start_date}
                      onChange={(e) => setNewMedication({
                        ...newMedication,
                        start_date: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                    <Input
                      type="date"
                      value={newMedication.end_date || ''}
                      onChange={(e) => setNewMedication({
                        ...newMedication,
                        end_date: e.target.value || null
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <Select
                      value={newMedication.category_id || 'none'}
                      onValueChange={(value) => setNewMedication({
                        ...newMedication,
                        category_id: value === 'none' ? null : value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={handleAddMedication}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Medication
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Medications List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Your Medications</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : medications.length > 0 ? (
                  <div className="space-y-4">
                    {medications.map((medication) => (
                      <div key={medication.id} className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-800">{medication.name}</h3>
                            <p className="text-sm text-gray-600">{medication.dose} - {medication.frequency_per_day}x daily</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Start: {new Date(medication.start_date).toLocaleDateString()}
                              {medication.end_date && ` • End: ${new Date(medication.end_date).toLocaleDateString()}`}
                            </p>
                            {medication.category_id && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {categories.find(c => c.id === medication.category_id)?.name || 'Category'}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMedication(medication.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No medications added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Category */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Add New Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Category name"
                    />
                  </div>
                  <Button className="w-full" onClick={handleAddCategory}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Categories List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Your Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : categories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => (
                      <div key={category.id} className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800">{category.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No categories added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
